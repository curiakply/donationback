const express = require("express");
const router = express.Router();
const {
  Login,
  Signup,
  Refresh,
  Logout,
} = require("../controllers/authController");
const loginLimitter = require("../middleware/loginLimiter");

router.get("/refresh", Refresh);
router.post("/login", loginLimitter, Login);
router.post("/signup", Signup);
router.post("/logout", Logout);

module.exports = router;
