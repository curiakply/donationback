const express = require('express');
const multer = require('multer');
const xlsx = require('xlsx');
const Koottayma = require('../models/Koottayma');

const router = express.Router();


const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, 'uploads/'); 
    },
    filename: (req, file, cb) => {
      cb(null, file.originalname);
    },
  });
  
  
  const upload = multer({ storage: storage });


router.post("/upload", upload.single("file"), async (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

   
    const workbook = xlsx.readFile(file.path);
    const sheetName = workbook.SheetNames[0];
    const sheetData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

    
    const parishData = sheetData.map((row) => ({
      name: row["name"],
      forane: row["forane"] || null,
      parish: row["parish"],
      kkey: row["kkey"] || null,
      kname: row["kname"] || null,      
    }));

  
    await Koottayma.insertMany(parishData);

   
    res.status(200).json({ message: "Data uploaded and saved successfully" });
  } catch (error) {
    console.error("Error in file upload route:", error);
    res.status(500).json({ message: "Error uploading data" });
  }
});

module.exports = router;
