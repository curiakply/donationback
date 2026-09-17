const Transaction = require('../models/FinanceTransation');
const Community = require('../models/Community');
const Funds = require('../models/Funds');
const Parish = require('../models/Parish');
const BalanceSheet = require('../models/BalanceSheet'); 
const mongoose = require("mongoose");

const { updateBalanceSheet, getEntityType, getEntityId } = require('../helpers/balanceUpdateHelper');
exports.createTransaction = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Log incoming request body
    console.log('Received transaction data:', req.body);

    const {
      voucher_no,
      date,
      year,  // Add year to destructuring
      transaction_type,
      amount,
      description,
      payment_method,
      transaction_number,
      community_id,
      fund_id,
      parish_id,
      family_id,
      receiver_name,
      balance_before,
      balance_after,
      status,
      other_project_type  // Add other_project_type
    } = req.body;

    // Create transaction with all fields including year
    const transaction = new Transaction({
      voucher_no,
      date,
      year,  // Include year
      transaction_type,
      amount,
      description,
      payment_method,
      transaction_number,
      community_id,
      fund_id,
      parish_id,
      family_id,
      receiver_name,
      balance_before,
      balance_after,
      status: status || 'completed',
      other_project_type  // Include other_project_type
    });

    // Log transaction object before save
    console.log('Transaction object before save:', {
      ...transaction.toObject(),
      year_value: transaction.year,
      year_type: typeof transaction.year
    });

    await transaction.save({ session });

    // Update balances based on transaction type
    switch (transaction_type) {
      case 'community':
        await Community.findByIdAndUpdate(
          community_id,
          { $inc: { balance: -amount } },
          { session }
        );
        break;

        case 'otherProject':
          await Funds.findByIdAndUpdate(
            fund_id,
            { $inc: { balance: -amount } },
            { session }
          );
          break;

      case 'family':
        if (parish_id) {
          await Parish.findByIdAndUpdate(
            parish_id,
            { $inc: { balance: -amount } },
            { session }
          );
        }
        break;
    }

    await session.commitTransaction();

    res.status(201).json({
      success: true,
      message: 'Transaction created successfully',
      data: transaction
    });
  } catch (error) {
    await session.abortTransaction();
    
    // Enhanced error logging
    console.error('Transaction error:', {
      message: error.message,
      name: error.name,
      validationErrors: error.errors,
      data: req.body,
      year: req.body.year,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      message: 'Error creating transaction',
      error: error.message,
      details: error.errors // Include validation error details in response
    });
  } finally {
    session.endSession();
  }
};
// Get all transactions with pagination and filtering
// controllers/financeTransationController.js
exports.getTransactions = async (req, res) => {
  try {
    console.log('Received request body:', req.body);

    // Get pagination parameters from request body
    const page = parseInt(req.body.page) || 1;
    const limit = parseInt(req.body.limit) || 10;
    const skip = (page - 1) * limit;

    // Build filter object
    const filter = {};

    if (req.body.type) {
      filter.transaction_type = req.body.type;
    }

    if (req.body.startDate && req.body.endDate) {
      filter.date = {
        $gte: new Date(req.body.startDate),
        $lte: new Date(req.body.endDate)
      };
    }

    console.log('Using filter:', filter);

    // Get total count
    const total = await Transaction.countDocuments(filter);
    console.log('Total documents:', total);

    // Get transactions with populated references
    const transactions = await Transaction.find(filter)
      .populate({
        path: 'community_id',
        select: 'name',
        model: 'Community'
      })
      .populate({
        path: 'fund_id',
        select: 'name finance',
        model: 'Funds'  // Changed to Funds
      })
      .populate({
        path: 'parish_id',
        select: 'name',
        model: 'Parish'
      })
      .populate({
        path: 'family_id',
        select: 'name',
        model: 'Family'
      })
      .sort({ date: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Process transactions to include fund details
    const processedTransactions = transactions.map(transaction => {
      if (transaction.fund_id) {
        const currentYear = new Date().getFullYear();
        const fundFinance = transaction.fund_id.finance?.find(f => f.year === currentYear);
        return {
          ...transaction,
          fund_id: {
            _id: transaction.fund_id._id,
            name: transaction.fund_id.name,
            currentBalance: fundFinance?.currentBalance || 0
          }
        };
      }
      return transaction;
    });

    console.log(`Found ${transactions.length} transactions`);

    res.json({
      success: true,
      data: processedTransactions,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Controller error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching transactions',
      error: error.message,
      stack: error.stack
    });
  }
};
  
exports.updateTransaction = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const oldTransaction = await Transaction.findById(req.params.id).session(session);
    if (!oldTransaction) {
      throw new Error('Transaction not found');
    }

    const newAmount = Number(req.body.amount);
    if (isNaN(newAmount) || newAmount <= 0) {
      throw new Error('Invalid amount');
    }

    // First, get the entity type and ID
    const entityType = getEntityType(oldTransaction.transaction_type);
    const entityId = getEntityId(oldTransaction);
    
    // Get the original balance sheet state
    const balanceSheet = await BalanceSheet.findOne({
      year: oldTransaction.year,
      entity_type: entityType,
      entity_id: entityId
    }).session(session);

    if (!balanceSheet) {
      throw new Error('Balance sheet not found');
    }

    // Calculate balance after reversing the old transaction
    const balanceAfterReversal = balanceSheet.current_balance + oldTransaction.amount;

    // Now check if the new amount is valid
    if (newAmount > balanceAfterReversal) {
      throw new Error(`Insufficient balance. Available balance: ${balanceAfterReversal}`);
    }

    // Update balance sheet
    balanceSheet.total_transactions = balanceSheet.total_transactions - oldTransaction.amount + newAmount;
    balanceSheet.last_transaction_date = new Date();
    await balanceSheet.save({ session });

    // Calculate final balance
    const finalBalance = balanceAfterReversal - newAmount;

    // Update transaction document
    const updatedTransaction = await Transaction.findByIdAndUpdate(
      req.params.id,
      {
        ...req.body,
        amount: newAmount,
        balance_before: balanceAfterReversal,
        balance_after: finalBalance,
        status: 'completed'
      },
      { new: true, session }
    );

    await session.commitTransaction();
    res.json({
      success: true,
      message: 'Transaction updated successfully',
      data: updatedTransaction
    });

  } catch (error) {
    await session.abortTransaction();
    console.error('Update error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating transaction: ' + error.message
    });
  } finally {
    session.endSession();
  }
};
function getCurrentBalance(balanceSheet) {
  return balanceSheet.opening_balance + 
         balanceSheet.allocated_amount - 
         balanceSheet.total_transactions;
}
// Replace the existing deleteTransaction function with this:
exports.deleteTransaction = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const transaction = await Transaction.findById(req.params.id).session(session);
    if (!transaction) {
      throw new Error('Transaction not found');
    }

    // Log transaction being deleted
    console.log('Deleting transaction:', {
      id: transaction._id,
      amount: transaction.amount,
      type: transaction.transaction_type
    });

    const entityType = getEntityType(transaction.transaction_type);
    const entityId = getEntityId(transaction);

    // Call updateBalanceSheet with isAddition = false for deletion
    await updateBalanceSheet(
      transaction.year,
      entityType,
      entityId,
      transaction.amount,
      false, // indicates this is a deletion
      session
    );

    // Update entity balance based on transaction type
    switch (transaction.transaction_type) {
      case 'community':
        await Community.findByIdAndUpdate(
          transaction.community_id,
          { $inc: { balance: transaction.amount } },
          { session }
        );
        break;

      case 'otherProject':
        await Funds.findByIdAndUpdate(
          transaction.fund_id,
          { $inc: { balance: transaction.amount } },
          { session }
        );
        break;

      case 'family':
        if (transaction.parish_id) {
          await Parish.findByIdAndUpdate(
            transaction.parish_id,
            { $inc: { balance: transaction.amount } },
            { session }
          );
        }
        break;
    }

    // Delete the transaction
    await Transaction.findByIdAndDelete(req.params.id, { session });

    await session.commitTransaction();
    res.json({
      success: true,
      message: 'Transaction deleted successfully'
    });

  } catch (error) {
    await session.abortTransaction();
    console.error('Error deleting transaction:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting transaction: ' + error.message
    });
  } finally {
    session.endSession();
  }
};