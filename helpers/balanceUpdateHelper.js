// Create this new file: src/helpers/balanceUpdateHelper.js

const mongoose = require('mongoose');
const BalanceSheet = require('../models/BalanceSheet');
const Transaction = require('../models/FinanceTransation');

async function updateBalanceSheetOnDelete(transaction, session) {
  try {
    const balanceSheet = await BalanceSheet.findOne({
      year: transaction.year,
      entity_type: getEntityType(transaction.transaction_type),
      entity_id: getEntityId(transaction)
    }).session(session);

    if (!balanceSheet) {
      throw new Error('Balance sheet not found');
    }

    // Log current state for debugging
    console.log('Before update:', {
      total_transactions: balanceSheet.total_transactions,
      amount: transaction.amount
    });

    // Update total_transactions by subtracting the transaction amount
    const updatedBalanceSheet = await BalanceSheet.findOneAndUpdate(
      {
        year: transaction.year,
        entity_type: getEntityType(transaction.transaction_type),
        entity_id: getEntityId(transaction)
      },
      {
        $inc: { total_transactions: -transaction.amount }, // Subtract the amount
        $set: { updatedAt: new Date() }
      },
      { 
        new: true,
        session 
      }
    );

    // Log updated state for debugging
    console.log('After update:', {
      total_transactions: updatedBalanceSheet.total_transactions
    });

    // Update last transaction date if needed
    const lastTransaction = await Transaction.findOne({
      year: transaction.year,
      [getEntityIdFieldName(transaction.transaction_type)]: getEntityId(transaction),
      _id: { $ne: transaction._id }
    })
    .sort({ date: -1 })
    .session(session);

    if (lastTransaction) {
      updatedBalanceSheet.last_transaction_date = lastTransaction.date;
    } else {
      updatedBalanceSheet.last_transaction_date = null;
    }

    await updatedBalanceSheet.save({ session });
    return updatedBalanceSheet;
  } catch (error) {
    console.error('Error in updateBalanceSheetOnDelete:', error);
    throw error;
  }
}

// Helper to get entity ID field name based on transaction type
function getEntityType(transactionType) {
  switch (transactionType) {
    case 'community':
      return 'community';
    case 'otherProject':
      return 'project';
    case 'family':
      return 'parish';
    default:
      throw new Error(`Invalid transaction type: ${transactionType}`);
  }
}

// Helper function to get entity ID
function getEntityId(transaction) {
  switch (transaction.transaction_type) {
    case 'community':
      return transaction.community_id;
    case 'otherProject':
      return transaction.fund_id;
    case 'family':
      return transaction.parish_id;
    default:
      throw new Error(`Invalid transaction type: ${transaction.transaction_type}`);
  }
}

// Updated balance sheet update helper
async function updateBalanceSheet(year, entityType, entityId, amount, isAddition, session) {
  const balanceSheet = await BalanceSheet.findOne({
    year,
    entity_type: entityType,
    entity_id: entityId
  }).session(session);

  if (!balanceSheet) {
    throw new Error(`Balance sheet not found for ${entityType} ${entityId} in year ${year}`);
  }

  // If it's a deletion (isAddition = false), we need to decrease total_transactions
  const updateAmount = isAddition ? amount : -amount;
  
  balanceSheet.total_transactions += updateAmount;
  balanceSheet.updatedAt = new Date();
  
  // // Log for debugging
  // console.log('Balance sheet update:', {
  //   operation: isAddition ? 'addition' : 'deletion',
  //   previousTotal: balanceSheet.total_transactions - updateAmount,
  //   amount: amount,
  //   updateAmount: updateAmount,
  //   newTotal: balanceSheet.total_transactions
  // });

  await balanceSheet.save({ session });
  return balanceSheet;
}

module.exports = {
  getEntityType,
  getEntityId,
  updateBalanceSheet
};