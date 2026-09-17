const express = require('express');
const multer = require('multer');
const xlsx = require('xlsx');
const families = require('../models/Person');

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

    function convertToDate(input) {
      // Handle Excel date serial number
      if (typeof input === 'number') {
        // Excel date serial number starts from 1900-01-01
        const excelEpoch = new Date(1900, 0, 1);
        const millisecondsSinceEpoch = (input - 1) * 24 * 60 * 60 * 1000;
        return new Date(excelEpoch.getTime() + millisecondsSinceEpoch);
      }
      
      // Handle string dates
      if (typeof input === 'string') {
        // Try different date formats
        const parsedDate = new Date(input);
        
        // Check if the date is valid
        if (!isNaN(parsedDate.getTime())) {
          return parsedDate;
        }
        
        // Handle specific format like "YYYY-MM-DD"
        const dateRegex = /^(\d{4})-(\d{2})-(\d{2})$/;
        const match = input.match(dateRegex);
        
        if (match) {
          return new Date(match[1], match[2] - 1, match[3]);
        }
      }
      
      // If all conversions fail, return null
      return null;
    }
    const parishData = sheetData.map((row) => ({
      name: row["name"],
      baptismName: row["baptismName"] || null,
      gender: row["gender"],
      dob: convertToDate(row["dob"]) || null,
      phone: row["phone"]|| null,
      email: row["email"]|| null,
      education: row["education"]|| null,
      occupation: row["occupation"]|| null,
      forane: row["forane"]|| null,
      parish: row["parish"]|| null,
      family: row["family"]|| null,
      relation: row["relation"]|| null,
      status: row["status"]|| null,
      Pname: row["Pname"]|| null,
      pid: row["pid"]|| null,
    }));

  
    await families.insertMany(parishData);

   
    res.status(200).json({ message: "Data uploaded and saved successfully" });
  } catch (error) {
    console.error("Error in file upload route:", error);
    res.status(500).json({ message: "Error uploading data" });
  }
});

module.exports = router;
