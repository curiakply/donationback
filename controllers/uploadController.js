const multer = require("multer");
const xlsx = require("xlsx");
const Forane = require("../models/Forane"); 


const storage = multer.memoryStorage();
const upload = multer({ storage: storage }).single("excelFile");

exports.uploadForaneExcel = async (req, res) => {
  upload(req, res, async (err) => {
    if (err) {
      return res.status(500).json({ error: "Failed to upload file" });
    }

    try {
      
      const workbook = xlsx.read(req.file.buffer, { type: "buffer" });
      const sheetName = workbook.SheetNames[0]; 
      const sheet = workbook.Sheets[sheetName];
      const data = xlsx.utils.sheet_to_json(sheet);

      
      const foranePromises = data.map(async (row) => {
        return Forane.create({
          name: row.name,
          building: row.building,
          phone: row.phone,
          street: row.street,
          city: row.city,
          district: row.district,
          state: row.state,
          pincode: row.pincode,
        });
      });

      await Promise.all(foranePromises);

      res.status(200).json({ message: "Forane data imported successfully" });
    } catch (error) {
      console.error("Error processing Excel file:", error);
      res.status(500).json({ error: "Failed to process Excel file" });
    }
  });
};
