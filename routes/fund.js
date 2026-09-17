const express = require("express");
const router = express.Router();

const {
  getAllFunds,
  getOneFund,
  createNewFund,
  updateFund,
  deleteFund,
} = require("../controllers/fundController");

router.get("/", getAllFunds);
router.get("/:fundId", getOneFund);
router.post("/", createNewFund);
router.put("/:fundId", updateFund);
router.delete("/:fundId", deleteFund);

module.exports = router;
