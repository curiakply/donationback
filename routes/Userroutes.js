const express = require("express");
const router = express.Router();
const {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  toggleStatus,
  getUserSummary,
} = require("../controllers/userController");

// Add your auth middleware here, e.g.:
// const { protect, superAdminOnly } = require("../middleware/auth");
// router.use(protect, superAdminOnly);

router.get("/summary", getUserSummary);
router.get("/", getAllUsers);
router.get("/:id", getUserById);
router.post("/", createUser);
router.put("/:id", updateUser);
router.patch("/:id/toggle-status", toggleStatus);
router.delete("/:id", deleteUser);

module.exports = router;