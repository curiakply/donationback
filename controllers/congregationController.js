const multer = require('multer');
const xlsx = require('xlsx');
const Congregation = require("../models/Congregation");

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
      if (!row.name || !row.pincode || !row.state || !row.district || !row.city || !row.phone || !row.building) {
        console.warn("Missing required field in row:", row);
        continue;
      }
      try {
        await new Congregation({
          name: String(row.name), pincode: String(row.pincode), state: String(row.state),
          district: String(row.district), city: String(row.city), phone: String(row.phone),
          building: String(row.building),
        }).save();
      } catch (err) { console.error("Error saving Congregation:", err); }
    }
    res.status(200).json({ message: "Congregations uploaded successfully." });
  } catch (err) {
    res.status(500).json({ message: "An error occurred while uploading Excel data." });
  }
}

async function getAllCongregations(req, res) {
  try {
    const congregations = await Congregation.find()
      .select("_id name phone building street pincode state district city");
    res.status(200).json(congregations);
  } catch (err) {
    res.status(500).json({ message: "An error occurred while fetching congregation data." });
  }
}

async function getOneCongregation(req, res) {
  try {
    const congregation = await Congregation.findById(req.params.congregationid);
    if (!congregation) return res.status(404).json({ message: "Congregation not found." });
    res.status(200).json(congregation);
  } catch (err) {
    res.status(500).json({ message: "An error occurred while fetching congregation data." });
  }
}

async function createNewCongregation(req, res) {
  try {
    const { name, building, phone, city, district, state, pincode } = req.body;
    if (!name || !building || !phone || !city || !district || !state || !pincode)
      return res.status(400).json({ message: "All fields are required." });
    if (await Congregation.findOne({ name }))
      return res.status(409).json({ message: "Congregation already exists." });
    const newCongregation = await new Congregation(req.body).save();
    res.status(201).json({ message: "Congregation created successfully.", congregation: newCongregation });
  } catch (err) {
    res.status(500).json({ message: "An error occurred while creating congregation." });
  }
}

async function updateCongregation(req, res) {
  try {
    const congregation = await Congregation.findByIdAndUpdate(req.params.congregationid, req.body);
    if (!congregation) return res.status(404).json({ message: "Congregation not found." });
    res.status(200).json({ message: "Congregation updated successfully." });
  } catch (err) {
    res.status(500).json({ message: "An error occurred while updating congregation." });
  }
}

async function deleteCongregation(req, res) {
  try {
    const congregation = await Congregation.findByIdAndDelete(req.params.congregationid);
    if (!congregation) return res.status(404).json({ message: "Congregation not found." });
    res.status(200).json({ message: "Congregation deleted successfully." });
  } catch (err) {
    res.status(500).json({ message: "An error occurred while deleting congregation." });
  }
}

module.exports = {
  uploadExcel: [upload.single('file'), uploadExcel],
  getAllCongregations, createNewCongregation, updateCongregation, getOneCongregation, deleteCongregation,
};