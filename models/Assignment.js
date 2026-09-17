const mongoose = require("mongoose");

const assignmentEntrySchema = new mongoose.Schema({
  // What is being assigned to
  assignmentType: {
    type: String,
    enum: ["Parish", "Department/Institution"],
    required: true,
  },

  // If Parish
  parish: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Parish",
    default: null,
  },

  // If Department/Institution
  department: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Department",
    default: null,
  },

  // Position held in this assignment
  position: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Position",
    default: null,
  },

  // Duration
  fromDate: { type: Date, required: true },
  toDate:   { type: Date, default: null },   // null = ongoing

  // Duration shorthand (optional display helper)
  durationYears:  { type: Number, default: null },
  durationMonths: { type: Number, default: null },

  notes: { type: String, default: "" },
});

const assignmentSchema = new mongoose.Schema(
  {
    priest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Priest",
      required: true,
    },
    assignments: [assignmentEntrySchema],
  },
  { timestamps: true }
);

const Assignment = mongoose.model("Assignment", assignmentSchema);
module.exports = Assignment;