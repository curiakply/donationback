const mongoose = require("mongoose");

const koottaymaSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
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
    kkey: {
      type: Number,
      required: false,
    },  
    kname: {
      type: String
     
    },  
  },
  {
    timestamps: true,
  }
);

const Koottayma = mongoose.model("Koottayma", koottaymaSchema);
module.exports = Koottayma;
