const express = require("express");
const router  = express.Router();
const PrintTemplate = require("../models/printTemplate.model");

// GET all templates (list view — returns all fields)
router.get("/", async (req, res) => {
  try {
    const templates = await PrintTemplate.find().sort({ updatedAt: -1 });
    res.json(templates);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch templates", error: err.message });
  }
});

// GET single template by ID (full elements array)
router.get("/:id", async (req, res) => {
  try {
    const template = await PrintTemplate.findById(req.params.id);
    if (!template) return res.status(404).json({ message: "Template not found" });
    res.json(template);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch template", error: err.message });
  }
});

// POST create new template
router.post("/", async (req, res) => {
  try {
    const { name, description, pageSize, canvasW, canvasH, canvasBg, elements } = req.body;
    if (!name || !canvasW || !canvasH) {
      return res.status(400).json({ message: "name, canvasW and canvasH are required" });
    }
    const template = new PrintTemplate({ name, description, pageSize, canvasW, canvasH, canvasBg, elements });
    await template.save();
    res.status(201).json(template);
  } catch (err) {
    res.status(500).json({ message: "Failed to create template", error: err.message });
  }
});

// PUT update existing template
router.put("/:id", async (req, res) => {
  try {
    const { name, description, pageSize, canvasW, canvasH, canvasBg, elements } = req.body;
    const template = await PrintTemplate.findByIdAndUpdate(
      req.params.id,
      { name, description, pageSize, canvasW, canvasH, canvasBg, elements },
      { new: true, runValidators: true }
    );
    if (!template) return res.status(404).json({ message: "Template not found" });
    res.json(template);
  } catch (err) {
    res.status(500).json({ message: "Failed to update template", error: err.message });
  }
});

// DELETE template
router.delete("/:id", async (req, res) => {
  try {
    const template = await PrintTemplate.findByIdAndDelete(req.params.id);
    if (!template) return res.status(404).json({ message: "Template not found" });
    res.json({ message: "Template deleted", id: req.params.id });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete template", error: err.message });
  }
});

module.exports = router;