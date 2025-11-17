import { GoogleGenAI } from "@google/genai";
import * as fs from "node:fs";
import dotenv from "dotenv";
import axios from "axios"; // <-- add axios to fetch remote image
dotenv.config();

export const geminiImageRequest = async (req, res) => {
  const ai = new GoogleGenAI({
    apiKey: process.env.GOOGLE_API_KEY,
  });

  const { item, fileImage } = req.body;
  console.log(item, fileImage);
  try {
    const imagePath = fileImage;
    let base64Image;

    if (imagePath.startsWith("http")) {
      // If it's a Cloudinary URL
      const response = await axios.get(imagePath, {
        responseType: "arraybuffer",
      });
      base64Image = Buffer.from(response.data, "binary").toString("base64");
    } else {
      // If it's a local file
      const imageData = fs.readFileSync(imagePath);
      base64Image = imageData.toString("base64");
    }

    const prompt = [
      { text: item },
      {
        inlineData: {
          mimeType: req.file ? req.file.mimetype : "image/jpeg",
          data: base64Image,
        },
      },
    ];

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: prompt,
    });

    for (const part of response.candidates[0].content.parts) {
      if (part.text) {
        console.log(part.text);
      } else if (part.inlineData) {
        const buffer = Buffer.from(part.inlineData.data, "base64");
        fs.writeFileSync("gemini-native-image.png", buffer);
        console.log("Image saved as gemini-native-image.png");
      }
    }

    res.json({ success: true, message: "Image processed successfully" });
  } catch (error) {
    console.error("Server error:", error);
    res.status(500).json({ error: error.message });
  }
};
