import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import wav from "wav";
import OpenAI from "openai";
import { v2 as cloudinary } from "cloudinary";
import { Readable } from "stream";

dotenv.config();

// cloudinary config
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const openai = new OpenAI({
  apiKey: process.env.GEMINI_API_KEY,
  baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
});

async function convertPCMToWAV(pcmData, channels = 1, rate = 24000, sampleWidth = 2) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    
    const writer = new wav.Writer({
      channels,
      sampleRate: rate,
      bitDepth: sampleWidth * 8,
    });

    writer.on("data", (chunk) => chunks.push(chunk));
    writer.on("finish", () => resolve(Buffer.concat(chunks)));
    writer.on("error", reject);

    writer.write(pcmData);
    writer.end();
  });
}

export const audioResponse = async (req, res) => {
  try {
    const { audioText } = req.body;
    console.log("audioText", audioText);

    const textResponse = await openai.chat.completions.create({
      model: "gemini-2.0-flash",
      messages: [
        {
          role: "system",
          content: `You are an AI voice assistant. Listen carefully to user audio, transcribe it accurately, and respond in a short, clear, and natural way. Avoid long explanations unless the user asks. Keep answers conversational, polite, and easy to understand.`,
        },
        {
          role: "user",
          content: audioText,
        },
      ],
    });

    console.log(textResponse.choices[0].message.content);

    const ai = new GoogleGenAI({
      apiKey: process.env.GOOGLE_API_KEY,
    });
    console.log("Generating audio response...");

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: textResponse.choices[0].message.content }] }],
      config: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: "Algieba" },
          },
        },
      },
    });

    const data = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    const pcmBuffer = Buffer.from(data, "base64");

    // Convert PCM to WAV format
    console.log("Converting PCM to WAV...");
    const wavBuffer = await convertPCMToWAV(pcmBuffer);

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { 
          resource_type: "video", // Use 'video' for audio files
          folder: "audio_responses",
          format: "wav" // Specify format
        },
        (error, result) => {
          if (error) {
            console.error("Cloudinary Upload Error:", error);
            return reject(error);
          }
          console.log("Cloudinary Upload Result:", result);
          resolve(result);
        }
      );

      const readableStream = Readable.from(wavBuffer);
      readableStream.pipe(uploadStream);
    })
    .then((result) => {
      return res.status(200).json({ audio: result.secure_url });
    })
    .catch((error) => {
      console.error("Upload failed:", error);
      return res.status(500).json({ error: "Audio upload failed" });
    });

  } catch (error) {
    console.error("Error in audioResponse:", error);
    return res.status(500).json({ error: "Failed to generate audio response" });
  }
};