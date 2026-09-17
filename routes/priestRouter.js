const express = require("express");
const router = express.Router();
const {
  getAllPriests, getPriestList,getOnePriest, createNewPriest, updatePriest, deletePriest,
  bulkUploadPriests, uploadMiddleware
} = require("../controllers/priestController");

router.get("/", getAllPriests);
router.get("/list", getPriestList);
router.get("/:priestid", getOnePriest);
router.post("/", createNewPriest);
router.put("/:priestid", updatePriest);
router.delete("/:priestid", deletePriest);
router.post("/bulk-upload", uploadMiddleware, bulkUploadPriests);
module.exports = router;