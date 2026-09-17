const express = require("express");
const router = express.Router();

const {
  getAllocationSetting,
  createNewAllocationSetting,
  updateAllocationSetting,
} = require("../controllers/allocationSettingsController");

router.get("/", getAllocationSetting);
router.post("/", createNewAllocationSetting);
router.put("/:allocationSettingsId", updateAllocationSetting);

module.exports = router; 
  