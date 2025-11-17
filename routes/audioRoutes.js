import express from "express";
import { audioResponse } from "../controller/audio.js";

const router = express.Router();
router.post("/", audioResponse);

export default router;
