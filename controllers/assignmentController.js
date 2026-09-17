const Assignment = require("../models/Assignment");

// GET all assignments (populated)
async function getAllAssignments(req, res) {
  try {
    const assignments = await Assignment.find()
      .populate("priest", "name phone")
      .populate("assignments.parish", "name")
      .populate("assignments.department", "name category subcategory")
      .populate("assignments.position", "name group");
    res.status(200).json(assignments);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "An error occurred while fetching assignments." });
  }
}

// GET one assignment record by id
async function getOneAssignment(req, res) {
  try {
    const assignment = await Assignment.findById(req.params.assignmentid)
      .populate("priest", "name phone")
      .populate("assignments.parish", "name")
      .populate("assignments.department", "name category subcategory")
      .populate("assignments.position", "name group");
    if (!assignment) return res.status(404).json({ message: "Assignment not found." });
    res.status(200).json(assignment);
  } catch (err) {
    res.status(500).json({ message: "An error occurred while fetching assignment." });
  }
}

// GET assignments for a specific priest
async function getAssignmentsByPriest(req, res) {
  try {
    const assignment = await Assignment.findOne({ priest: req.params.priestid })
      .populate("priest", "name phone")
      .populate("assignments.parish", "name")
      .populate("assignments.department", "name category subcategory")
      .populate("assignments.position", "name group");
    if (!assignment) return res.status(200).json(null);
    res.status(200).json(assignment);
  } catch (err) {
    res.status(500).json({ message: "An error occurred while fetching assignment." });
  }
}

// CREATE or UPDATE assignments for a priest
// Each priest has one Assignment document; entries are pushed to the array
async function saveAssignment(req, res) {
  try {
    const { priestId, assignments } = req.body;
    if (!priestId || !assignments || !assignments.length)
      return res.status(400).json({ message: "Priest and at least one assignment are required." });

    let doc = await Assignment.findOne({ priest: priestId });
    if (doc) {
      doc.assignments = assignments;
      await doc.save();
      return res.status(200).json({ message: "Assignments updated successfully.", assignment: doc });
    }

    const newDoc = await new Assignment({ priest: priestId, assignments }).save();
    res.status(201).json({ message: "Assignments created successfully.", assignment: newDoc });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "An error occurred while saving assignment." });
  }
}

// DELETE an entire assignment document
async function deleteAssignment(req, res) {
  try {
    const assignment = await Assignment.findByIdAndDelete(req.params.assignmentid);
    if (!assignment) return res.status(404).json({ message: "Assignment not found." });
    res.status(200).json({ message: "Assignment deleted successfully." });
  } catch (err) {
    res.status(500).json({ message: "An error occurred while deleting assignment." });
  }
}

module.exports = { getAllAssignments, getOneAssignment, getAssignmentsByPriest, saveAssignment, deleteAssignment };