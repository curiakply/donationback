const mongoose = require("mongoose");

// ─── Sub-schema: Person (shared for groom & bride) ────────────────────────────

const personSchema = new mongoose.Schema(
  {
    houseName:          { type: String, trim: true },
    baptismalName:      { type: String, trim: true },
    officialName:       { type: String, trim: true, required: true },
    fatherName:         { type: String, trim: true },
    motherName:         { type: String, trim: true },
    parish:             { type: mongoose.Schema.Types.ObjectId, ref: "Parish" },
    diocese:            { type: mongoose.Schema.Types.ObjectId, ref: "Diocese" },
    dob:                { type: Date },
    dateOfBaptism:      { type: Date },
    dateOfConfirmation: { type: Date },
  },
  { _id: false }
);

// ─── Sub-schema: Witness ──────────────────────────────────────────────────────

const witnessSchema = new mongoose.Schema(
  {
    name:    { type: String, trim: true },
    address: { type: String, trim: true },
  },
  { _id: false }
);

// ─── Main Marriage schema ─────────────────────────────────────────────────────

const marriageSchema = new mongoose.Schema(
  {
    certificateNo:  { type: String, trim: true },
    registrationNo: { type: String, trim: true },

    groom: { type: personSchema, required: true },
    bride: { type: personSchema, required: true },

    dateOfMarriage:  { type: Date, required: true },
    placeOfMarriage: { type: String, trim: true },
    minister:        { type: mongoose.Schema.Types.ObjectId, ref: "Priest" },
    ministerName:    { type: String, trim: true },   // free-text fallback
    vicarName:       { type: String, trim: true },   // Vicar / Asst. Vicar name
    witnesses:       [witnessSchema],

    notes: { type: String, trim: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Marriage", marriageSchema);