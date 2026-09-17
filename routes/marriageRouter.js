const express = require("express");
const router  = express.Router();

const {
  getAllMarriages,
  getOneMarriage,
  createMarriage,
  updateMarriage,
  deleteMarriage,
} = require("../controllers/marriageController");

router.get(   "/",              getAllMarriages);
router.get(   "/:marriageid",   getOneMarriage);
router.post(  "/",              createMarriage);
router.put(   "/:marriageid",   updateMarriage);
router.delete("/:marriageid",   deleteMarriage);

module.exports = router;