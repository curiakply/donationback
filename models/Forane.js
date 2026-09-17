const mongoose = require("mongoose");

const foraneSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    building: {
      type: String,
      required: false,
    },
    phone: {
      type: String,
      required: false,
    },
    street: {
      type: String,
    },
    city: {
      type: String,
      required: false,
    },
    district: {
      type: String,
      required: false,
    },
    state: {
      type: String,
      required: false,
    },
    pincode: {
      type: String,
      required: false,
    }
  },
  {
    timestamps: true,
  }
);

const Forane = mongoose.model("Forane", foraneSchema);
module.exports = Forane;
