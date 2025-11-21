import { GoogleGenAI } from "@google/genai";
import * as fs from "node:fs";
import dotenv from "dotenv";
import axios from "axios"; // <-- add axios to fetch remote image
import cloudinary from "./cloudinary.js";
dotenv.config();

export const geminiImageRequest = async (req, res) => {
  const ai = new GoogleGenAI({
    apiKey: process.env.GOOGLE_API_KEY,
  });

  const { item, fileImage } = req.body;
  console.log("geminiImageRequest payload:", { item, hasFile: !!req.file });
  try {
    let base64Image = null;
    let inputMime = "image/jpeg";

    // Priority: multer uploaded file (req.file), then fileImage in body (could be URL or data URI), otherwise no image
    if (req.file && req.file.path) {
      const imageData = fs.readFileSync(req.file.path);
      base64Image = imageData.toString("base64");
      inputMime = req.file.mimetype || inputMime;

      // optional cleanup of temp file
      try {
        fs.unlinkSync(req.file.path);
      } catch (e) {
        // ignore cleanup errors
      }
    } else if (fileImage && typeof fileImage === "string") {
      // fileImage might be a remote URL, a data URI, or a local path
      if (fileImage.startsWith("http")) {
        const response = await axios.get(fileImage, {
          responseType: "arraybuffer",
        });
        base64Image = Buffer.from(response.data, "binary").toString("base64");
        // try to detect mime from headers
        inputMime = response.headers["content-type"] || inputMime;
      } else if (fileImage.startsWith("data:")) {
        // data:[mime];base64,xxxx
        const match = fileImage.match(/^data:(.+);base64,(.*)$/);
        if (match) {
          inputMime = match[1] || inputMime;
          base64Image = match[2];
        }
      } else {
        // assume local path
        const imageData = fs.readFileSync(fileImage);
        base64Image = imageData.toString("base64");
      }
    }

    // build prompt; include inlineData only when we have an image
    const prompt = [{ text: item }];
    if (base64Image) {
      prompt.push({
        inlineData: {
          mimeType: inputMime,
          data: base64Image,
        },
      });
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: prompt,
    });

    let outputText = "";
    let generatedImageUrl = null;

    const parts = response.candidates?.[0]?.content?.parts || [];
    console.log("gemini image parts:", parts.length);

    // Helper to upload dataUri or base64/mime to Cloudinary
    const tryUploadData = async (mimeType, base64DataOrDataUri) => {
      try {
        if (!base64DataOrDataUri) return null;
        const dataUri =
          typeof base64DataOrDataUri === "string" &&
          base64DataOrDataUri.startsWith("data:")
            ? base64DataOrDataUri
            : `data:${mimeType};base64,${base64DataOrDataUri}`;
        const uploadResult = await cloudinary.uploader.upload(dataUri, {
          folder: "ai_images",
        });
        console.log(
          "Cloudinary uploadResult:",
          uploadResult.public_id,
          uploadResult.secure_url
        );
        return uploadResult.secure_url;
      } catch (err) {
        console.error("Cloudinary upload error:", err);
        return null;
      }
    };

    for (const part of parts) {
      // collect textual output
      if (part.text) outputText += part.text + "\n";

      // 1) inlineData.data -> base64 bytes
      if (part.inlineData && part.inlineData.data) {
        const mimeType = part.inlineData.mimeType || "image/png";
        const base64Data = part.inlineData.data;
        const url = await tryUploadData(mimeType, base64Data);
        if (url) generatedImageUrl = url;
      }

      // 2) inlineData.uri or inlineData.url (remote hosted image)
      if (
        !generatedImageUrl &&
        part.inlineData &&
        (part.inlineData.uri || part.inlineData.url)
      ) {
        generatedImageUrl = part.inlineData.uri || part.inlineData.url;
        console.log("Found image URL in inlineData:", generatedImageUrl);
      }

      // 3) common image-like fields
      if (!generatedImageUrl) {
        const candidate =
          part.uri ||
          part.url ||
          part.image?.uri ||
          part.image?.url ||
          part.image;
        if (
          candidate &&
          typeof candidate === "string" &&
          candidate.match(/https?:\/\/.+\.(png|jpg|jpeg|gif|webp)/i)
        ) {
          generatedImageUrl = candidate;
          console.log("Found candidate image URL:", generatedImageUrl);
        }
      }

      // 4) fallback: search nested fields for base64-like strings and upload
      if (!generatedImageUrl) {
        const searchBase64 = (obj) => {
          if (!obj) return null;
          if (typeof obj === "string") {
            if (
              obj.startsWith("data:") ||
              obj.startsWith("/9j/") ||
              obj.startsWith("iVBOR")
            )
              return obj;
            return null;
          }
          if (typeof obj === "object") {
            for (const k of Object.keys(obj)) {
              const found = searchBase64(obj[k]);
              if (found) return found;
            }
          }
          return null;
        };

        const found = searchBase64(part);
        if (found) {
          // found may be a data URI or raw base64; attempt upload
          const url = await tryUploadData(
            "image/png",
            found.startsWith("data:")
              ? found
              : found.replace(/^data:\w+\/\w+;base64,/, "")
          );
          if (url) generatedImageUrl = url;
        }
      }
    }

    // If model didn't return inlineData but returned a URL in text, try to extract it
    if (!generatedImageUrl && outputText) {
      const urlMatch = outputText.match(
        /(https?:\/\/(?:www\.)?\S+\.(?:png|jpg|jpeg|gif|webp))/i
      );
      if (urlMatch) {
        generatedImageUrl = urlMatch[0];
        console.log("Extracted image URL from text:", generatedImageUrl);
      }
    }

    return res.json({
      success: true,
      message: outputText.trim() || "Image processed successfully",
      image: generatedImageUrl,
    });
  } catch (error) {
    console.error("Server error:", error);
    res.status(500).json({ error: error.message });
  }
};
