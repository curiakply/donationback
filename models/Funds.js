const mongoose = require("mongoose");

const fundsSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true // Keep this unique for the name
    },
    finance: [
      {
        year: {
          type: Number,
          default: function () {
            return new Date().getFullYear();
          },
        },
        allocatedAmount: {
          type: Number,
          default: 0
        },
        openingBalance: {
          type: Number,
          default: 0
        },
        currentBalance: {
          type: Number,
          default: 0
        },
        closingBalance: {
          type: Number,
          default: 0
        }
      }
    ]
  },
  {
    timestamps: true
  }
);

const Funds = mongoose.model("Funds", fundsSchema);
module.exports = Funds;
