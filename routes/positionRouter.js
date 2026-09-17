const express = require("express");
const router = express.Router();
const { getAllPositions, createNewPosition, updatePosition, deletePosition } = require("../controllers/positionController");

router.get("/", getAllPositions);
router.post("/", createNewPosition);
router.put("/:positionid", updatePosition);
router.delete("/:positionid", deletePosition);

module.exports = router;