const mongoose = require("mongoose");

const congregationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    building: { type: String },
    phone: { type: String },
    street: { type: String },
    city: { type: String },
    district: { type: String },
    state: { type: String },
    pincode: { type: String },
  },
  { timestamps: true }
);

const Congregation = mongoose.model("Congregation", congregationSchema);
module.exports = Congregation;