import express from "express";
import multer from "multer";

import { geminiImageRequest } from "../controller/geminiImage.js";

const router = express.Router();


const upload = multer({ dest: "uploads/" });

router.post("/",upload.single("fileImage"), geminiImageRequest);

export default router;
