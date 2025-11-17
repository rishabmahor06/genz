import multer from 'multer';



const  storage = multer.diskStorage({
    filename: function (req, file, cb) {
        let fileExt = file.originalname.split('.').pop();


        const fileName = `${Date.now()}.${fileExt}`;
        cb(null, fileName);
    },
});



const fileFilter = (req, file, cb) => {
    if (file.mimetype !== 'audio/mpeg' && file.mimetype !== 'audio/mp3') { 
        req.fileValidationError = 'file type must be mp3 or mpeg';
        return cb(null, false, req.fileValidationError);
    } else {
        cb(null , true);
    }
} 



const upload = multer({
     storage,
    fileFilter,
   
}).single('audio'); 



 export default upload;