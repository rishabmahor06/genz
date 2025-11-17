import dotenv from "dotenv";
dotenv.config();
import express from "express";
import cors from "cors";
import geminiRoutes from "./routes/geminiRoutes.js";
import audioRoutes from "./routes/audioRoutes.js";
import geminiImageRoute from "./routes/imageRoute.js";

const app = express();
const port = process.env.PORT || 5000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    exposedHeaders: ["Set-Cookie", "Authorization"],
    preflightContinue: false,
    optionsSuccessStatus: 204,
  })
);


// Routes
app.use("/gemini", geminiRoutes);
app.use("/audio", audioRoutes);
app.use("/gemini-image", geminiImageRoute);
app.get("/", (req, res) => {
  res.send("hello world");
});

app.listen(port, () => {
  console.log(`server running on port : ${port}`);
});
