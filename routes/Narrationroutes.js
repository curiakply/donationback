const express = require("express");
const router = express.Router();
const Narration = require("../models/Narration");

// Get all
router.get("/", async (req, res) => {
  try {
    const data = await Narration.find().sort({ createdAt: -1 });
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get by id
router.get("/:id", async (req, res) => {
  try {
    const data = await Narration.findById(req.params.id);
    if (!data) return res.status(404).json({ message: "Not found" });
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create
router.post("/", async (req, res) => {
  try {
    const data = await Narration.create(req.body);
    res.status(201).json(data);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Update
router.put("/:id", async (req, res) => {
  try {
    const data = await Narration.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!data) return res.status(404).json({ message: "Not found" });
    res.json(data);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete
router.delete("/:id", async (req, res) => {
  try {
    const data = await Narration.findByIdAndDelete(req.params.id);
    if (!data) return res.status(404).json({ message: "Not found" });
    res.json({ message: "Deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;