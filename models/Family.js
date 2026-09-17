const mongoose = require("mongoose");

const familySchema = new mongoose.Schema(
  {
    id: {
      type: Number,
      required: true,
      unique: true,
    },
    name: {
      type: String,
      required: true,
    },
    building: {
      type: String,
      required: false,
    },
    forane: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Forane",
      required: true,
    },
    parish: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Parish",
      required: true,
    },
    koottayma: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Koottayma",
      required: true,
    },
    head: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Person",
      default: undefined,
    },
    phone: {
      type: String,
      required: false,
    },
    street: {
      type: String,
      required: false,
    },
    city: {
      type: String,
      required: false,
    },
    district: {
      type: String,
      required: false,
    },
    pincode: {
      type: String,
      required: false,
    },
    status: {
      type: String,
      required: true,
      default: "active",
    },
    Narration: {
      type: String,
      required: false,
    },
    familyNumber: { 
      type: Number, 
      required: true 
    },
    Pname: {
      type: String,
      required: false,
    },
    verify: {
      type: String,
      required: false,
      default: "NO",
    },
  },
  {
    timestamps: true,
  }
);

// ==========================================
// FAMILY SCHEMA INDEXES
// ==========================================

// Primary lookup index
familySchema.index({ _id: 1, familyNumber: 1 });

// Unique index for family ID
familySchema.index({ id: 1 }, { unique: true });

// Compound indexes for common queries
familySchema.index({ forane: 1, parish: 1 });
familySchema.index({ parish: 1, koottayma: 1 });
familySchema.index({ status: 1 });
familySchema.index({ familyNumber: 1 });

// Sparse index for head (not all families may have heads initially)
familySchema.index({ head: 1 }, { sparse: true });

function determineRelation(member, newHead) {
  if (newHead.relation === "wife") {
    return "husband";
  } else if (newHead.relation === "husband") {
    return "wife";
  } else if (newHead.relation === "son" || newHead.relation === "daughter") {
    if (member.gender === "male") {
      return "father";
    } else {
      return "mother";
    }
  } else if (newHead.relation === "father" || newHead.relation === "mother") {
    if (member.gender === "male") {
      return "son";
    } else {
      return "daughter";
    }
  } else if (newHead.relation === "brother" || newHead.relation === "sister") {
    if (member.gender === "male") {
      return "brother";
    } else {
      return "sister";
    }
  }
}
const Family = mongoose.model("Family", familySchema);
module.exports = Family;
