// models/printSettingsModel.js
const mongoose = require("mongoose");

const PrintSettingsSchema = new mongoose.Schema(
  {
    collectionName: { type: String, required: true, unique: true, index: true },

    // Header
    headerLine1:    { type: String, default: "" },
    headerLine2:    { type: String, default: "" },
    headerLine3:    { type: String, default: "" },
    headerLine4:    { type: String, default: "" },
    churchNameSize: { type: String, default: "large", enum: ["small", "medium", "large"] },

    // Logo — stored as base64 data URL (can be ~500 KB)
    showLogo:    { type: Boolean, default: false },
    logoUrl:  { type: String,  default: "" },

    // Section visibility
    showHeader:       { type: Boolean, default: true },
    showChurchName:   { type: Boolean, default: true },
    showSubtitle:     { type: Boolean, default: true },
    showCertNumbers:  { type: Boolean, default: true },
    showDatePlace:    { type: Boolean, default: true },
    showGroom:        { type: Boolean, default: true },
    showBride:        { type: Boolean, default: true },
    showCeremony:     { type: Boolean, default: true },
    showWitnesses:    { type: Boolean, default: true },
    showNotes:        { type: Boolean, default: true },
    showTextSeal:     { type: Boolean, default: true },
    showMinisterSig:  { type: Boolean, default: true },
    showPrintDate:    { type: Boolean, default: true },

    // Margins (mm)
    marginTop:   { type: Number, default: 10 },
    marginLeft:  { type: Number, default: 14 },
    marginRight: { type: Number, default: 14 },

    // Last-used print defaults
    pageSize:  { type: String, default: "a4portrait" },
    theme:     { type: String, default: "classic" },
    vicarName: { type: String, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("PrintSettings", PrintSettingsSchema);