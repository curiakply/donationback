const Position = require("../models/Position");

async function getAllPositions(req, res) {
  try {
    const positions = await Position.find().select("_id name group createdAt");
    res.status(200).json(positions);
  } catch (err) {
    res.status(500).json({ message: "An error occurred while fetching positions." });
  }
}

async function createNewPosition(req, res) {
  try {
    const { name, group } = req.body;
    if (!name) return res.status(400).json({ message: "Position name is required." });
    if (await Position.findOne({ name }))
      return res.status(409).json({ message: "Position already exists." });
    const position = await new Position({ name }).save();
    res.status(201).json({ message: "Position created successfully.", position });
  } catch (err) {
    res.status(500).json({ message: "An error occurred while creating position." });
  }
}

async function updatePosition(req, res) {
  try {
    const position = await Position.findByIdAndUpdate(req.params.positionid,  req.body, { new: true });
    if (!position) return res.status(404).json({ message: "Position not found." });
    res.status(200).json({ message: "Position updated successfully." });
  } catch (err) {
    res.status(500).json({ message: "An error occurred while updating position." });
  }
}

async function deletePosition(req, res) {
  try {
    const position = await Position.findByIdAndDelete(req.params.positionid);
    if (!position) return res.status(404).json({ message: "Position not found." });
    res.status(200).json({ message: "Position deleted successfully." });
  } catch (err) {
    res.status(500).json({ message: "An error occurred while deleting position." });
  }
}

module.exports = { getAllPositions, createNewPosition, updatePosition, deletePosition };