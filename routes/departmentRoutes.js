const express = require("express");
const router = express.Router();
const {
  getAllDepartments, getOneDepartment, createNewDepartment, updateDepartment, deleteDepartment,
} = require("../controllers/departmentController");

router.get("/", getAllDepartments);
router.get("/:departmentid", getOneDepartment);
router.post("/", createNewDepartment);
router.put("/:departmentid", updateDepartment);
router.delete("/:departmentid", deleteDepartment);

module.exports = router;