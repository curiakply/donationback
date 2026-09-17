// routes/printSettingsRoutes.js
const express = require("express");
const router  = express.Router();
const {
  getSettings, saveSettings, resetSettings,
  uploadLogo, uploadLogoMiddleware,
} = require("../controllers/printSettingsController");

// Settings CRUD
router.get   ("/:collectionName", getSettings);
router.put   ("/:collectionName", saveSettings);
router.delete("/:collectionName", resetSettings);

// Logo upload — multer middleware runs first, then the handler
router.post("/logo/:collectionName", uploadLogoMiddleware, uploadLogo);

module.exports = router;