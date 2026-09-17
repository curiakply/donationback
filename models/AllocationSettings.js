const mongoose = require("mongoose");
const { parse, format, isAfter } = require("date-fns");

const allocationSettingsSchema = new mongoose.Schema(
  {
    date: {
      type: Date,
      default: function () {
        const formattedDate = format(new Date(), "dd/MM/yyyy");
        return parse(formattedDate, "dd/MM/yyyy", new Date());
      },
      validate: {
        validator: function (value, err) {
          return !isAfter(value, new Date());
        },
        message: "Date cannot be after today.",
      },
      set: function (value) {
        if (typeof value === "string") {
          return parse(value, "dd/MM/yyyy", new Date());
        }
        return value;
      },
      get: function (value) {
        return value ? format(value, "dd/MM/yyyy") : null;
      },
    },
    year: {
      type: Number,
      default: function () {
        return this.date.getFullYear();
      },
    },
    slab: [
      {
        minimum: {
          type: Number,
          required: true,
          default: 0,
        },
        maximum: {
          type: Number,
          required: true,
        },
      },
    ],
    totalAmount: {
      type: Number,
      default: undefined,
    },
    communityAllocation: [
      {
        community: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Community",
          required: true,
        },
        allocationPercentage: {
          type: Number,
          required: true,
        },
        allocatedAmount: {
          type: Number,
          required: true,
        },
      },
    ],
    parishAllocation: {
      allocationPercentage: {
        type: Number,
        required: true,
      },
      allocateAmount: {
        type: Number,
        required: true,
      },
    },
    fundsAllocation: [
      {
        fund: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Funds",
          required: true,
        },
        allocationPercentage: {
          type: Number,
          required: true,
        },
        allocatedAmount: {
          type: Number,
          required: true,
        },
      },
    ],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

allocationSettingsSchema.pre("save", async function (next) {
  const CreditTransaction = mongoose.model("CreditTransaction");
  const result = await CreditTransaction.aggregate([
    { $match: { year: this.year } },
    { $group: { _id: null, totalAmount: { $sum: "$amountPaid" } } },
  ]);
  this.totalAmount = result.length > 0 ? result[0].totalAmount : 0;
  next();
});

const AllocationSettings = mongoose.model(
  "AllocationSettings",
  allocationSettingsSchema
);
module.exports = AllocationSettings;
