const mongoose = require("mongoose");

const dioceseSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    building: { type: String },
    phone: { type: String },
    street: { type: String },
    city: { type: String },
    district: { type: String },
    state: { type: String },
    pincode: { type: String },
    locationCategory: {
  type: String,
  enum: ["Inside Kerala", "Outside Kerala", "Outside India"],
  required: true,
},
 category: {
        type: String,
        enum: ["SYRO MALABAR", "LATIN", "SYRO MALANKARA"],
        required: true,
        },
  },
  { timestamps: true }
);

const Diocese = mongoose.model("Diocese", dioceseSchema);
module.exports = Diocese;