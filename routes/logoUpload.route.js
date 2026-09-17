// routes/logoUpload.route.js
const express = require("express");
const multer  = require("multer");
const path    = require("path");
const fs      = require("fs");

const router = express.Router();

// ── Storage config ────────────────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, "../uploads/logos");
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    // e.g.  logo_marriage_1717600000000.png
    const ext  = path.extname(file.originalname).toLowerCase();
    const name = `logo_${req.params.type}_${Date.now()}${ext}`;
    cb(null, name);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB max
  fileFilter: (req, file, cb) => {
    const allowed = [".png", ".jpg", ".jpeg", ".webp", ".svg"];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error("Only image files are allowed"));
  },
});

// POST /api/upload/logo/:type   (type = "marriage" | "baptism" | etc.)
router.post("/:type", upload.single("logo"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });

  // Return the public URL — adjust base URL to match your server
  const logoUrl = `/uploads/logos/${req.file.filename}`;
  res.json({ logoUrl });
});

module.exports = router;