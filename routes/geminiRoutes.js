import express from "express";
import { handleGeminiRequest } from "../controller/geminiController.js";

const router = express.Router();

router.post("/", handleGeminiRequest);

export default router;
