const mongoose = require("mongoose");

const narrationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Narration", narrationSchema);