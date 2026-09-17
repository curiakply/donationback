const mongoose = require("mongoose");

const departmentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: ["Department", "Organization", "Institution"],
      required: true,
    },
    subcategory: {
      type: String,
      enum: [
        // Department subcategories
        "Pastoral Department",
        "Social Department",
        // Organization subcategories
        "Pastoral Organizations",
        "Social Organizations",
        // Institution subcategories
        "Pastoral Institutions",
        "Educational Institutions",
        "Medical Institutions",
        "Training Institutions",
        "Business Institutions",
      ],
      required: true,
    },
  },
  { timestamps: true }
);

const Department = mongoose.model("Department", departmentSchema);
module.exports = Department;