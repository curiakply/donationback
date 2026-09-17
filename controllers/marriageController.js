const Marriage = require("../models/marriageModel");

// ─── GET all ──────────────────────────────────────────────────────────────────

async function getAllMarriages(req, res) {
  try {
    const marriages = await Marriage.find()
      .populate("groom.parish",   "name")
      .populate("groom.diocese",  "name")
      .populate("bride.parish",   "name")
      .populate("bride.diocese",  "name")
      .populate("minister",       "name")
      .sort({ dateOfMarriage: -1 });

    res.status(200).json(marriages);
  } catch (err) {
    console.error("getAllMarriages:", err);
    res.status(500).json({ message: "An error occurred while fetching marriage records." });
  }
}

// ─── GET one ──────────────────────────────────────────────────────────────────

async function getOneMarriage(req, res) {
  try {
    const marriage = await Marriage.findById(req.params.marriageid)
      .populate("groom.parish",   "name")
      .populate("groom.diocese",  "name")
      .populate("bride.parish",   "name")
      .populate("bride.diocese",  "name")
      .populate("minister",       "name");

    if (!marriage) return res.status(404).json({ message: "Marriage record not found." });
    res.status(200).json(marriage);
  } catch (err) {
    console.error("getOneMarriage:", err);
    res.status(500).json({ message: "An error occurred while fetching the marriage record." });
  }
}

// ─── POST create ──────────────────────────────────────────────────────────────

async function createMarriage(req, res) {
  try {
    const {
      certificateNo, registrationNo,
      groom, bride,
      dateOfMarriage, placeOfMarriage,
      minister, ministerName, vicarName,
      witnesses, notes,
    } = req.body;

    // Basic validation
    if (!groom?.officialName) return res.status(400).json({ message: "Groom's official name is required." });
    if (!bride?.officialName) return res.status(400).json({ message: "Bride's official name is required." });
    if (!dateOfMarriage)      return res.status(400).json({ message: "Date of marriage is required." });

    const newMarriage = await new Marriage({
      certificateNo,
      registrationNo,
      groom,
      bride,
      dateOfMarriage,
      placeOfMarriage,
      minister:  minister  || null,
      ministerName: ministerName || "",
      vicarName:    vicarName    || "",
      witnesses: witnesses || [],
      notes,
    }).save();

    const populated = await Marriage.findById(newMarriage._id)
      .populate("groom.parish",  "name")
      .populate("groom.diocese", "name")
      .populate("bride.parish",  "name")
      .populate("bride.diocese", "name")
      .populate("minister",      "name");

    res.status(201).json({ message: "Marriage record created successfully.", marriage: populated });
  } catch (err) {
    console.error("createMarriage:", err);
    res.status(500).json({ message: "An error occurred while creating the marriage record." });
  }
}

// ─── PUT update ───────────────────────────────────────────────────────────────

async function updateMarriage(req, res) {
  try {
    const marriage = await Marriage.findByIdAndUpdate(
      req.params.marriageid,
      req.body,
      { new: true, runValidators: true }
    )
      .populate("groom.parish",  "name")
      .populate("groom.diocese", "name")
      .populate("bride.parish",  "name")
      .populate("bride.diocese", "name")
      .populate("minister",      "name");

    if (!marriage) return res.status(404).json({ message: "Marriage record not found." });
    res.status(200).json({ message: "Marriage record updated successfully.", marriage });
  } catch (err) {
    console.error("updateMarriage:", err);
    res.status(500).json({ message: "An error occurred while updating the marriage record." });
  }
}

// ─── DELETE ───────────────────────────────────────────────────────────────────

async function deleteMarriage(req, res) {
  try {
    const marriage = await Marriage.findByIdAndDelete(req.params.marriageid);
    if (!marriage) return res.status(404).json({ message: "Marriage record not found." });
    res.status(200).json({ message: "Marriage record deleted successfully." });
  } catch (err) {
    console.error("deleteMarriage:", err);
    res.status(500).json({ message: "An error occurred while deleting the marriage record." });
  }
}

module.exports = {
  getAllMarriages,
  getOneMarriage,
  createMarriage,
  updateMarriage,
  deleteMarriage,
};