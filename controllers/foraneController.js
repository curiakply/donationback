const express = require('express');
const multer = require('multer');
const xlsx = require('xlsx');
const Forane = require("../models/Forane");

// Set up storage
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

async function uploadExcel(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded." });
    }

    const workbook = xlsx.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(worksheet);

    console.log("Data loaded from Excel:", data); // Log the data

    for (const row of data) {
      if (!row.name || !row.pincode || !row.state || !row.district || !row.city || !row.phone || !row.building) {
        console.warn("Missing required field in row:", row);
        continue; 
      }  
        
    
      const newForane = new Forane({
        name: String(row.name),
        pincode: String(row.pincode),
        state: String(row.state),
        district: String(row.district),
        city: String(row.city),
        phone: String(row.phone),
        building: String(row.building)
      });
    
      try {
        await newForane.save();
        console.log("Saved Forane:", newForane);
      } catch (error) {
        console.error("Error saving Forane:", error);
      }
    }
    

    res.status(200).json({ message: "Foranes uploaded successfully." });
  } catch (error) {
    console.error("Error during upload:", error);
    res.status(500).json({ message: "An error occurred while uploading Excel data." });
  }
}



async function getAllForanes(req, res) {
  try {
    const foranes = await Forane.find().select("_id name phone building street pincode state district");
    if (!foranes) {
      res.status(404).json({ message: "No foranes found." });
    } else {
      res.status(200).json(foranes);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "An error occurred while fetching forane data." });
  }
}

async function getOneForane(req, res) {
  try {
    const forane = await Forane.findById(req.params.foraneid);
    if (!forane) {
      res.status(404).json({ message: "Forane not found." });
    } else {
      res.status(200).json(forane);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "An error occurred while fetching forane data." });
  }
}

async function createNewForane(req, res) {
  try {
    const { name, building, phone, city, district, state, pincode } = req.body;

    // Check for missing fields
    if (!name || !building || !phone || !city || !district || !state || !pincode) {
      return res.status(400).json({ message: "All fields are required." });
    }

    // Check if Forane already exists
    const foraneExists = await Forane.findOne({ name });
    if (foraneExists) {
      return res.status(409).json({ message: "Forane already exists." });
    }

    // Create and save the new Forane
    const newForane = new Forane(req.body);
    await newForane.save();
    res.status(201).json({ message: "Forane created successfully.", forane: newForane });
  } catch (err) {
    console.error("Error creating Forane:", err);
    res.status(500).json({ message: "An error occurred while creating forane." });
  }
}

async function updateForane(req, res) {
  try {
    const forane = await Forane.findByIdAndUpdate(
      req.params.foraneid,
      req.body
    );
    if (!forane) {
      res.status(404).json({ message: "Forane not found." });
    } else {
      res.status(200).json({ message: "Forane updated successfully." });
    }
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ message: "An error occurred while updating forane" });
  }
}

async function deleteForane(req, res) {
  try {
    const forane = await Forane.findByIdAndDelete(req.params.foraneid);
    if (!forane) {
      res.status(404).json({ message: "Forane not found." });
    } else {
      res.status(200).json({ message: "Forane deleted successfully." });
    }
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ message: "An error occurred while deleting forane" });
  }
}

module.exports = {
  uploadExcel: [upload.single('file'), uploadExcel],
  getAllForanes,
  createNewForane,
  updateForane,
  getOneForane,
  deleteForane,
};
