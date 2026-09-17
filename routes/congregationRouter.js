const express = require("express");
const router = express.Router();
const {
  uploadExcel, getAllCongregations, createNewCongregation,
  updateCongregation, getOneCongregation, deleteCongregation,
} = require("../controllers/congregationController");

router.get("/", getAllCongregations);
router.get("/:congregationid", getOneCongregation);
router.post("/", createNewCongregation);
router.put("/:congregationid", updateCongregation);
router.delete("/:congregationid", deleteCongregation);
router.post("/upload", uploadExcel);

module.exports = router;