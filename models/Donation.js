const mongoose = require("mongoose");

const donationSchema = new mongoose.Schema(
  {
    priest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Priest",
      required: true,
    },
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    purpose: { type: String, required: true },
    currency: {
      type: String,
      enum: ["USD", "CAD", "AUD", "GBP", "EUR", "INR"],
      required: true,
    },
    amount: { type: Number, required: true, min: 0 },
    inrAmount: { type: Number, min: 0 },
    modeOfTransfer: {
      type: String,
      enum: ["Wire Transfer", "NEFT/RTGS", "Cash"],
      required: true,
    },
    date: { type: Date, default: Date.now },
    remarks: { type: String, default: "" },
  },
  { timestamps: true }
);
donationSchema.index({ date: -1 });
donationSchema.index({ priest: 1, date: -1 });
donationSchema.index({ organization: 1, date: -1 });
donationSchema.index({ date: -1, inrAmount: 1 }); // covers most aggregations
module.exports = mongoose.model("Donation", donationSchema);