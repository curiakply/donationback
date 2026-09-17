const express = require('express');
const multer = require('multer');
const xlsx = require('xlsx');
const Parish = require("../models/Parish");

const router = express.Router();

// Configure Multer to store uploaded files in the "uploads" directory
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, 'uploads/'); // Ensure this folder exists
    },
    filename: (req, file, cb) => {
      cb(null, file.originalname); // Keep the original file name
    },
  });
  
  // Initialize multer
  const upload = multer({ storage: storage });

// Route to handle file upload and data insertion
router.post("/upload", upload.single("file"), async (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    // Read the uploaded Excel file
    const workbook = xlsx.readFile(file.path);
    const sheetName = workbook.SheetNames[0];
    const sheetData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

    // Map the sheet data to the Parish model structure
    const parishData = sheetData.map((row) => ({
      name: row["name"],
      building: row["building"] || null,
      forane: row["forane"],
      phone: row["phone"] || null,
      street: row["street"] || null,
      city: row["vname"] || null,
      district: row["avname"] || null,
      state: row["state"] || null,
      pincode: row["pincode"] || null,
      idold: row["idold"] || null,
    }));

    // Insert the parsed data into MongoDB
    await Parish.insertMany(parishData);

    // Send a success response
    res.status(200).json({ message: "Data uploaded and saved successfully" });
  } catch (error) {
    console.error("Error in file upload route:", error);
    res.status(500).json({ message: "Error uploading data" });
  }
});

module.exports = router;
