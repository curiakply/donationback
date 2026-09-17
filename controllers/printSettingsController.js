// controllers/printSettingsController.js

const multer        = require("multer");
const axios         = require("axios");
const PrintSettings = require("../models/printSettingsModel");

// ── Multer — memory storage (no disk, works on Vercel) ───────────────────────
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error("Only PNG, JPEG, WebP or SVG images are allowed"));
  },
});

const uploadLogoMiddleware = upload.single("logo");

// ── GitHub helper ─────────────────────────────────────────────────────────────
async function commitFileToGitHub(filePath, fileBuffer) {
  const token  = process.env.GITHUB_TOKEN;
  const owner  = process.env.GITHUB_OWNER;
  const repo   = process.env.GITHUB_REPO;
  const branch = process.env.GITHUB_BRANCH || "main";

  if (!token || !owner || !repo) {
    throw new Error("Missing GITHUB_TOKEN, GITHUB_OWNER or GITHUB_REPO in .env");
  }

  const apiUrl  = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept:        "application/vnd.github+json",
  };

  // Check if file already exists — need SHA to update
  let sha;
  try {
    const { data } = await axios.get(apiUrl, { headers });
    sha = data.sha;
  } catch (err) {
    if (err.response?.status !== 404) throw err; // 404 = new file, anything else is a real error
  }

  // Commit the file (create or update)
  await axios.put(apiUrl, {
    message: `chore: update logo (${filePath})`,
    content: fileBuffer.toString("base64"),
    branch,
    ...(sha ? { sha } : {}),
  }, { headers });

  return `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${filePath}`;
}

// ── GET settings ──────────────────────────────────────────────────────────────
async function getSettings(req, res) {
  try {
    const { collectionName = "marriage" } = req.params;
    const settings = await PrintSettings.findOne({ collectionName });
    if (!settings) return res.status(404).json({ message: "No print settings found." });
    res.status(200).json(settings);
  } catch (err) {
    console.error("getSettings:", err);
    res.status(500).json({ message: "Failed to fetch print settings." });
  }
}

// ── POST logo upload ──────────────────────────────────────────────────────────
async function uploadLogo(req, res) {
  if (!req.file) return res.status(400).json({ message: "No file uploaded." });

  const { collectionName = "marriage" } = req.params;
  const ext      = req.file.originalname.split(".").pop().toLowerCase();
  const filePath = `uploads/logos/logo_${collectionName}.${ext}`;

  console.log("uploadLogo called — collectionName:", collectionName, "filePath:", filePath);

  try {
    const logoUrl = await commitFileToGitHub(filePath, req.file.buffer);
    console.log("commitFileToGitHub returned:", logoUrl);

    if (!logoUrl) throw new Error("commitFileToGitHub returned empty URL");

    // Use native MongoDB driver — bypasses Mongoose strict mode completely
    await PrintSettings.collection.updateOne(
      { collectionName },
      {
        $set:   { collectionName, logoUrl, showLogo: true },
        $unset: { logoDataUrl: "" },
      },
      { upsert: true }
    );

    // Verify the save by fetching fresh
    const saved = await PrintSettings.findOne({ collectionName }).lean();
    console.log("uploadLogo verified — logoUrl in DB:", saved?.logoUrl);

    res.status(200).json({ logoUrl, showLogo: true });
  } catch (err) {
    console.error("uploadLogo error:", err.response?.data || err.message);
    res.status(500).json({ message: err.response?.data?.message || err.message });
  }
}

// ── PUT settings ──────────────────────────────────────────────────────────────
async function saveSettings(req, res) {
  try {
    const { collectionName = "marriage" } = req.params;
    const { logoDataUrl, ...rest } = req.body;

    if (rest.logoUrl?.startsWith("blob:")) delete rest.logoUrl;

    const settings = await PrintSettings.findOneAndUpdate(
      { collectionName },
      {
        $set:   { ...rest, collectionName },
        $unset: { logoDataUrl: "" },
      },
      { upsert: true, new: true, runValidators: false, setDefaultsOnInsert: true }
    );

    res.status(200).json({ message: "Print settings saved.", settings });
  } catch (err) {
    console.error("saveSettings:", err);
    res.status(500).json({ message: "Failed to save print settings." });
  }
}

// ── DELETE (reset) ────────────────────────────────────────────────────────────
async function resetSettings(req, res) {
  try {
    const { collectionName = "marriage" } = req.params;
    await PrintSettings.findOneAndDelete({ collectionName });
    res.status(200).json({ message: "Print settings reset to defaults." });
  } catch (err) {
    console.error("resetSettings:", err);
    res.status(500).json({ message: "Failed to reset print settings." });
  }
}

module.exports = { getSettings, saveSettings, resetSettings, uploadLogo, uploadLogoMiddleware };