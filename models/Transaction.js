const mongoose = require("mongoose");
const { parse, format, isAfter } = require("date-fns");

const transactionSchema = new mongoose.Schema(
  {
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
    family: {
      type: String,
      required: true,
    },
    person: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Person",
      required: true,
    },
    amountPaid: {
      type: Number,
      required: true,
    },
    date: {
      type: Date,
      default: function () {
        const formattedDate = format(new Date(), "dd/MM/yyyy");
        return parse(formattedDate, "dd/MM/yyyy", new Date());
      },
      validate: {
        validator: function (value) {
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
    transferHistory: [{
      fromPerson: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Person",
        required: true
      },
      toPerson: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Person",
        required: true
      },
      reason: {
        type: String,
        required: true
      },
      status: {
        type: String,
        enum: ['moved_out', 'deceased', 'undo','rollback'],
        required: true
      },
      transferDate: {
        type: Date,
        default: Date.now,
        required: true
      }
    }],
    isTransferred: {
      type: Boolean,
      default: false
    },
    transferReason: String,
    transferDate: Date,
    originalPerson: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Person"
    },
    status: {
      type: String,
      enum: ['active', 'transferred', 'restored'],
      default: 'active'
    }
  },
  {
    timestamps: true,
    toJSON: { getters: true },
    toObject: { getters: true }
  }
);

// ==========================================
// TRANSACTION SCHEMA INDEXES - CRITICAL FOR PERFORMANCE
// ==========================================

// Most important compound index for the main query
transactionSchema.index({ person: 1, status: 1, date: 1, isTransferred: 1 });

// Additional performance indexes
transactionSchema.index({ person: 1, status: 1 });
transactionSchema.index({ person: 1, date: 1, status: 1 });
transactionSchema.index({ person: 1, status: 1, isTransferred: 1 });
transactionSchema.index({ person: 1, originalPerson: 1, status: 1 });

// Indexes for other common queries
transactionSchema.index({ family: 1, status: 1 });
transactionSchema.index({ forane: 1, parish: 1 });
transactionSchema.index({ status: 1 });
transactionSchema.index({ date: 1 });
transactionSchema.index({ originalPerson: 1 }, { sparse: true });

// Pre-save middleware
transactionSchema.pre("save", async function (next) {
  try {
    const personId = this.person;
    const dateObject = parse(this.date, "dd/MM/yyyy", new Date());
    const year = dateObject.getFullYear();

    if (this.isTransferred || this.status === 'transferred') {
      return next();
    }

    const existingTransaction = await this.constructor
      .findOne({
        person: personId,
        date: {
          $gte: new Date(`${year}-04-01`),
          $lte: new Date(`${year+1}-03-31`),
        },
        status: 'active'
      });

    if (existingTransaction && existingTransaction._id.toString() !== this._id.toString()) {
      throw new Error("Only one active transaction per person per year is allowed.");
    }

    if (this.isNew) {
      this.originalPerson = this.person;
    }

    next();
  } catch (error) {
    next(error);
  }
});

// Static methods without transactions
transactionSchema.statics.transferToHead = async function(fromPersonId, toPersonId, reason, status) {
  try {
    // Find the original transaction
    const transaction = await this.findOne({ 
      person: fromPersonId,
      status: 'active'
    });

    if (!transaction) {
      throw new Error('No active transaction found for this person');
    }

    // Create new transaction for head
    const newTransaction = new this({
      forane: transaction.forane,
      parish: transaction.parish,
      family: transaction.family,
      person: toPersonId,
      amountPaid: transaction.amountPaid,
      date: transaction.date,
      originalPerson: fromPersonId,
      isTransferred: true,
      transferReason: reason,
      transferDate: new Date(),
      status: 'transferred',
      transferHistory: [{
        fromPerson: fromPersonId,
        toPerson: toPersonId,
        reason: reason,
        status: status,
        transferDate: new Date()
      }]
    });

    // Update original transaction
    transaction.status = 'transferred';
    transaction.isTransferred = true;
    transaction.transferDate = new Date();
    transaction.transferReason = reason;

    // Save both transactions
    await Promise.all([
      transaction.save(),
      newTransaction.save()
    ]);

    return newTransaction;
  } catch (error) {
    throw error;
  }
};

transactionSchema.statics.undoTransfer = async function(transactionId) {
  try {
    const transaction = await this.findById(transactionId);
    if (!transaction || !transaction.isTransferred) {
      throw new Error('Transaction not found or not transferred');
    }

    const originalTransaction = await this.findOne({
      person: transaction.originalPerson,
      status: 'transferred'
    });

    if (originalTransaction) {
      originalTransaction.status = 'active';
      originalTransaction.isTransferred = false;
      await originalTransaction.save();
    }

    transaction.status = 'restored';
    transaction.transferHistory.push({
      fromPerson: transaction.person,
      toPerson: transaction.originalPerson,
      reason: 'Transfer undone',
      status: 'undo',
      transferDate: new Date()
    });

    await transaction.save();
    return originalTransaction || transaction;
  } catch (error) {
    throw error;
  }
};


const Transaction = mongoose.model("Transaction", transactionSchema);
module.exports = Transaction;