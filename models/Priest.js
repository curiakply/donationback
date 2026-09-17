const mongoose = require("mongoose");

const addressSchema = {
  houseName: { type: String, default: "" },
  street: { type: String, default: "" },
  city: { type: String, default: "" },
  district: { type: String, default: "" },
  state: { type: String, default: "" },
  pincode: { type: String, default: "" },
  country: { type: String, default: "India" },
};

const priestSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    hname: { type: String, required: true },
    dob: { type: Date },
    ordinationDate: { type: Date },
    email: { type: String },
    phone: { type: String },

    workingRegion: {
      type: String,
      enum: ["India", "Abroad"],
      default: "India",
    },
    workingCountry: { type: String, default: "" },

    homeAddress: addressSchema,
    currentAddress: addressSchema,

    homeType: {
      type: String,
      enum: ["homeDiocese", "otherDiocese", "congregation"],
      required: true,
    },
    homeParish: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Parish",
      default: null,
    },
    homeParishText: { type: String, default: "" },
    homeCongregation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Congregation",
      default: null,
    },
    status: {
      type: String,
      enum: ["active", "inactive", "retired", "died"],
      required: true,
      default: "active",
    },
    // Add to priestSchema
statusHistory: [
  {
    status: { type: String, enum: ["active", "inactive", "retired", "died"], required: true },
    date: { type: Date, required: true },
    changedAt: { type: Date, default: Date.now },  // ← ADD
    restHome: { type: String, default: "" },
    remarks: { type: String, default: "" },
    _id: false,
  },
],
    statusDate: { type: Date, default: null },
    restHome: { type: String, default: "" },
  },
  { timestamps: true }
);
priestSchema.index({ status: 1 });
priestSchema.index({ workingRegion: 1 });
const Priest = mongoose.model("Priest", priestSchema);
module.exports = Priest;