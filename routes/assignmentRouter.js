const express = require("express");
const router = express.Router();
const {
  getAllAssignments,
  getOneAssignment,
  getAssignmentsByPriest,
  saveAssignment,
  deleteAssignment,
} = require("../controllers/assignmentController");

router.get("/", getAllAssignments);
router.get("/:assignmentid", getOneAssignment);
router.get("/priest/:priestid", getAssignmentsByPriest);
router.post("/", saveAssignment);
router.delete("/:assignmentid", deleteAssignment);

module.exports = router;