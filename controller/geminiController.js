import OpenAI from "openai";
import dotenv from "dotenv";
dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.GEMINI_API_KEY,
  baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
});

export const handleGeminiRequest = async (req, res) => {
  try {
    const { item } = req.body;

    if (!item) {
      return res.status(400).json({ message: "item field is required" });
    }

    // Gemini OpenAI-compatible endpoint
    const completion = await openai.chat.completions.create({
      model: "gemini-2.5-flash",
      messages: [
        { role: "system", content: "You are a helpful assistant." },
        { role: "user", content: item },
      ],
    });
    console.log(completion);

    const output = completion.choices[0].message.content;
    res.json({ message: output });
  } catch (error) {
    console.error("🔥 BACKEND ERROR:", {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
      headers: error.response?.headers,
    });

    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.response?.data || error.message,
    });
  }
};
