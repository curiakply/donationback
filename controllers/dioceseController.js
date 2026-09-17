const multer = require('multer');
const xlsx = require('xlsx');
const Diocese = require("../models/Diocese");

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, file.originalname),
});
const upload = multer({ storage });

async function uploadExcel(req, res) {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded." });
    const workbook = xlsx.readFile(req.file.path);
    const data = xlsx.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
    for (const row of data) {
      if (!row.name || !row.pincode || !row.state || !row.district || !row.city || !row.phone || !row.building) continue;
      try {
        await new Diocese({
          name: String(row.name), pincode: String(row.pincode), state: String(row.state),
          district: String(row.district), city: String(row.city), phone: String(row.phone),
          building: String(row.building),
        }).save();
      } catch (err) { console.error("Error saving Diocese:", err); }
    }
    res.status(200).json({ message: "Dioceses uploaded successfully." });
  } catch (err) {
    res.status(500).json({ message: "An error occurred while uploading Excel data." });
  }
}

async function getAllDioceses(req, res) {
  try {
    const dioceses = await Diocese.find().select("_id name phone building street pincode state district city locationCategory category");
    res.status(200).json(dioceses);
  } catch (err) {
    res.status(500).json({ message: "An error occurred while fetching diocese data." });
  }
}

async function getOneDiocese(req, res) {
  try {
    const diocese = await Diocese.findById(req.params.dioceseid);
    if (!diocese) return res.status(404).json({ message: "Diocese not found." });
    res.status(200).json(diocese);
  } catch (err) {
    res.status(500).json({ message: "An error occurred while fetching diocese data." });
  }
}

async function createNewDiocese(req, res) {
  try {
    const { name, building, phone, city, district, state, pincode, category } = req.body;
    if (!name || !building || !phone || !city || !district || !state || !pincode )
      return res.status(400).json({ message: "All fields are required." });
    if (await Diocese.findOne({ name }))
      return res.status(409).json({ message: "Diocese already exists." });
    const newDiocese = await new Diocese(req.body).save();
    res.status(201).json({ message: "Diocese created successfully.", diocese: newDiocese });
  } catch (err) {
    res.status(500).json({ message: "An error occurred while creating diocese." });
  }
}

async function updateDiocese(req, res) {
  try {
    const diocese = await Diocese.findByIdAndUpdate(req.params.dioceseid, req.body);
    if (!diocese) return res.status(404).json({ message: "Diocese not found." });
    res.status(200).json({ message: "Diocese updated successfully." });
  } catch (err) {
    res.status(500).json({ message: "An error occurred while updating diocese." });
  }
}

async function deleteDiocese(req, res) {
  try {
    const diocese = await Diocese.findByIdAndDelete(req.params.dioceseid);
    if (!diocese) return res.status(404).json({ message: "Diocese not found." });
    res.status(200).json({ message: "Diocese deleted successfully." });
  } catch (err) {
    res.status(500).json({ message: "An error occurred while deleting diocese." });
  }
}

module.exports = {
  uploadExcel: [upload.single('file'), uploadExcel],
  getAllDioceses, createNewDiocese, updateDiocese, getOneDiocese, deleteDiocese,
};