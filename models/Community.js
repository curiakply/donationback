const mongoose = require("mongoose");

const communitySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique:true
    },
    phone: {
      type: String,
      required: true,
    },
    headOfCommunity: {
      fullName: {
        type: String,
        required: true,
      },
      email: {
        type: String,
      },
      phoneNumber: {
        type: String,
        required: true,
      },
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
          default: 0,
        },
        openingBalance: {
          type: Number,
          default: 0,
        },
        currentBalance: {
          type: Number,
          default: 0,
        },
        closingBalance: {
          type: Number,
          deafult: 0,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

communitySchema.methods.updateOpeningBalance = async function () {
  const currentYear = new Date().getFullYear();
  const lastYearFinance = this.finance.find((f) => f.year === currentYear - 1);
  if (lastYearFinance && lastYearFinance.closingBalance > 0) {
    const currentYearFinance = this.finance.find((f) => f.year === currentYear);
    if (currentYearFinance) {
      currentYearFinance.openingBalance = lastYearFinance.closingBalance;
    } else {
      this.finance.push({
        year: currentYear,
        openingBalance: lastYearFinance.closingBalance,
      });
    }
    await this.save();
  }
};

communitySchema.methods.updateCurrentBalance = async function (amount) {
  const currentYear = new Date().getFullYear();
  let currentYearFinance = this.finance.find((f) => f.year === currentYear);
  if (!currentYearFinance) {
    currentYearFinance = {
      year: currentYear,
    };
    this.finance.push(currentYearFinance);
  }
  currentYearFinance.currentBalance += amount;
  await this.save();
};

communitySchema.methods.updateClosingBalance = async function () {
  const currentYear = new Date().getFullYear();
  const currentYearFinance = this.finance.find((f) => f.year === currentYear);
  if (currentYearFinance) {
    currentYearFinance.closingBalance = currentYearFinance.currentBalance;
    await this.save();
  }
};

communitySchema.methods.setAllocatedAmount = async function (amount) {
  const currentYear = new Date().getFullYear();
  let currentYearFinance = this.finance.find((f) => f.year === currentYear);
  if (!currentYearFinance) {
    currentYearFinance = {
      year: currentYear,
    };
    this.finance.push(currentYearFinance);
  }
  currentYearFinance.allocatedAmount = amount;
  await this.save();
};

const Community = mongoose.model("Community", communitySchema);
module.exports = Community;
