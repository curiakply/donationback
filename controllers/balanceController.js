// controllers/balanceController.js
const BalanceSheet = require('../models/BalanceSheet');
const Transaction = require('../models/Transaction');
const CommunitySettings = require('../models/CommunitySettings');
const ProjectSettings = require('../models/ProjectSettings');
const ParishSettings = require('../models/ParishSettings');
const mongoose = require("mongoose");
exports.updateBalanceSheet = async (year, entityType, entityId) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Get previous year's closing balance
    const previousYear = year - 1;
    const previousBalance = await BalanceSheet.findOne({
      year: previousYear,
      entity_type: entityType,
      entity_id: entityId
    });

    // Get current year's allocation based on entity type
    let currentAllocation = 0;
    switch (entityType) {
      case 'community':
        const communitySettings = await CommunitySettings.findOne({
          year,
          'settings.community_id': entityId
        });
        currentAllocation = communitySettings?.settings?.find(s => 
          s.community_id.toString() === entityId.toString()
        )?.allocated_amount || 0;
        break;

      case 'project':
        const projectSettings = await ProjectSettings.findOne({
          year,
          'settings.fund_id': entityId
        });
        currentAllocation = projectSettings?.settings?.find(s => 
          s.fund_id.toString() === entityId.toString()
        )?.allocated_amount || 0;
        break;

      case 'parish':
        const parishSettings = await ParishSettings.findOne({
          year,
          'settings.parish_id': entityId
        });
        currentAllocation = parishSettings?.settings?.find(s => 
          s.parish_id.toString() === entityId.toString()
        )?.allocated_amount || 0;
        break;

      default:
        throw new Error('Invalid entity type');
    }

    // Get total transactions with date range for the financial year
    const startDate = new Date(year, 4, 1); // April 1st
    const endDate = new Date(year + 1, 3, 31); // March 31st next year

    const transactions = await Transaction.aggregate([
      { 
        $match: {
          date: { $gte: startDate, $lte: endDate },
          status: 'completed',
          [`${entityType}_id`]: mongoose.Types.ObjectId(entityId)
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' },
          count: { $sum: 1 },
          latest_transaction: { $max: '$date' }
        }
      }
    ]);

    const totalTransactions = transactions[0]?.total || 0;
    const transactionCount = transactions[0]?.count || 0;
    const latestTransactionDate = transactions[0]?.latest_transaction;

    // Calculate balances
    const openingBalance = previousBalance?.closing_balance || 0;
    const closingBalance = openingBalance + currentAllocation - totalTransactions;

    // Update or create balance sheet entry
    const updatedBalance = await BalanceSheet.findOneAndUpdate(
      {
        year,
        entity_type: entityType,
        entity_id: entityId
      },
      {
        opening_balance: openingBalance,
        allocated_amount: currentAllocation,
        total_transactions: totalTransactions,
        closing_balance: closingBalance,
        transaction_count: transactionCount,
        last_transaction_date: latestTransactionDate,
        updated_at: new Date()
      },
      { 
        upsert: true, 
        new: true,
        session,
        runValidators: true
      }
    );

    // Add monthly breakdown if needed
    if (transactions.length > 0) {
      const monthlyBreakdown = await Transaction.aggregate([
        {
          $match: {
            date: { $gte: startDate, $lte: endDate },
            status: 'completed',
            [`${entityType}_id`]: mongoose.Types.ObjectId(entityId)
          }
        },
        {
          $group: {
            _id: {
              year: { $year: '$date' },
              month: { $month: '$date' }
            },
            total: { $sum: '$amount' },
            count: { $sum: 1 }
          }
        },
        {
          $sort: {
            '_id.year': 1,
            '_id.month': 1
          }
        }
      ]);

      await BalanceSheet.findByIdAndUpdate(
        updatedBalance._id,
        {
          $set: {
            monthly_breakdown: monthlyBreakdown
          }
        },
        { session }
      );
    }

    await session.commitTransaction();
    return updatedBalance;

  } catch (error) {
    await session.abortTransaction();
    console.error('Error updating balance sheet:', error);
    throw error;
  } finally {
    session.endSession();
  }
};
const getCurrentBalance = async (year, entityType, entityId) => {
    const currentYear = new Date().getFullYear();
    
    // Get balance sheet for current year
    const balanceSheet = await BalanceSheet.findOne({
      year,
      entity_type: entityType,
      entity_id: entityId
    });
  
    if (!balanceSheet) {
      return 0;
    }
  
    return balanceSheet.opening_balance + 
           balanceSheet.allocated_amount - 
           balanceSheet.total_transactions;
  };
  
  // Get parish balance
  exports.getParishBalance = async (req, res) => {
    try {
      const parishId = req.params.id;
      const currentYear = new Date().getFullYear();
      
      const balance = await getCurrentBalance(currentYear, 'parish', parishId);
  
      res.json({
        success: true,
        balance
      });
    } catch (error) {
      console.error('Error fetching parish balance:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching parish balance',
        error: error.message
      });
    }
  };
  
  // Get community balance
  exports.getCommunityBalance = async (req, res) => {
    try {
      const communityId = req.params.id;
      const currentYear = new Date().getFullYear();
      
      const balance = await getCurrentBalance(currentYear, 'community', communityId);
  
      res.json({
        success: true,
        balance
      });
    } catch (error) {
      console.error('Error fetching community balance:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching community balance',
        error: error.message
      });
    }
  };
  
  // Get fund (project) balance
  exports.getFundBalance = async (req, res) => {
    try {
      const fundId = req.params.id;
      const currentYear = new Date().getFullYear();
      
      const balance = await getCurrentBalance(currentYear, 'project', fundId);
  
      res.json({
        success: true,
        balance
      });
    } catch (error) {
      console.error('Error fetching fund balance:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching fund balance',
        error: error.message
      });
    }
  };