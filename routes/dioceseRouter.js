const express = require("express");
const router = express.Router();
const {
  uploadExcel, getAllDioceses, createNewDiocese,
  updateDiocese, getOneDiocese, deleteDiocese,
} = require("../controllers/dioceseController");

router.get("/", getAllDioceses);
router.get("/:dioceseid", getOneDiocese);
router.post("/", createNewDiocese);
router.put("/:dioceseid", updateDiocese);
router.delete("/:dioceseid", deleteDiocese);
router.post("/upload", uploadExcel);

module.exports = router;