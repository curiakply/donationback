const mongoose = require("mongoose");

const PrintTemplateSchema = new mongoose.Schema(
  {
    name:        { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    pageSize:    { type: String, default: "a4", enum: ["a4","a4l","letter","id","badge"] },
    canvasW:     { type: Number, required: true },
    canvasH:     { type: Number, required: true },
    canvasBg:    { type: String, default: "#ffffff" },
    elements:    { type: Array,  default: [] },
    certType:    { type: String, default: "none" },  // e.g. "marriage", "baptism", "none"
  },
  { timestamps: true }
);

module.exports = mongoose.model("PrintTemplate", PrintTemplateSchema);