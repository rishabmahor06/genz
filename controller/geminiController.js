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

    const response = await openai.chat.completions.create({
      model: "gemini-2.0-flash",
      messages: [
        { role: "system", content: "You are a helpful assistant." },
        { role: "user", content: item },
      ],
    });

    const messages = response.choices[0].message.content;
    console.log(messages);
    res.json({ message: messages });
  } catch (error) {
    console.error("error:", error);
    res.status(500).json({ message: "something went wrong" });
  }
};
