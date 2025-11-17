

const cloudinaryUpload = async (req, res) => {
  const file = req.file;
  if (!file) {
    return res.status(400).json({ message: "No file uploaded" });
  }


  const fileName = file.originalname.split('.')[0] ;
  console.log("Received file:", fileName);


  try {
    const uploadAudio = await cloudinary.uploader.upload(file.path, {
      resource_type: "auto",
      folder: "ai_audio",
        public_id: fileName,
    });
    console.log("Upload result:", uploadAudio);
    // res.json({
    //   message: "Audio uploaded successfully",
    //   url: uploadAudio.secure_url,
    // });
    return uploadAudio;
  } catch (error) {
    return res.status(400).json({ message: "Upload failed", error: error.message });
  }
};


export default cloudinaryUpload;