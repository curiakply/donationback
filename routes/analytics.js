// Backend Route - Analytics for your specific schema
const express = require('express');
const router = express.Router();
const Transaction = require('../models/Transaction'); // Adjust path
const Family = require('../models/Family'); // Adjust path
const Parish = require('../models/Parish');

router.get('/parish-wise-analysis', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Both startDate and endDate are required'
      });
    }

    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    if (start > end) {
      return res.status(400).json({
        success: false,
        message: 'startDate cannot be after endDate'
      });
    }

    // Aggregate by parish
    const parishStats = await Transaction.aggregate([
      {
        $match: {
          date: {
            $gte: start,
            $lte: end
          },
          status: "active"
        }
      },
      {
        $group: {
          _id: "$parish",
          totalTransactions: { $sum: 1 },
          totalAmount: { 
            $sum: { $ifNull: ["$amountPaid", 0] }
          },
          uniqueFamilies: { $addToSet: "$family" },
          firstTransaction: { $min: "$date" },
          lastTransaction: { $max: "$date" }
        }
      },
      {
        $lookup: {
          from: "parishes",
          localField: "_id",
          foreignField: "_id",
          as: "parishInfo"
        }
      },
      {
        $project: {
          _id: 0,
          parishId: "$_id",
          parishName: {
            $ifNull: [
              { $arrayElemAt: ["$parishInfo.name", 0] },
              "Unknown Parish"
            ]
          },
          totalTransactions: 1,
          totalAmount: 1,
          uniqueFamiliesCount: { $size: "$uniqueFamilies" },
          averagePerTransaction: {
            $cond: [
              { $gt: ["$totalTransactions", 0] },
              { $divide: ["$totalAmount", "$totalTransactions"] },
              0
            ]
          },
          averagePerFamily: {
            $cond: [
              { $gt: [{ $size: "$uniqueFamilies" }, 0] },
              { $divide: ["$totalAmount", { $size: "$uniqueFamilies" }] },
              0
            ]
          },
          firstTransaction: 1,
          lastTransaction: 1
        }
      },
      {
        $sort: { totalAmount: -1 }
      }
    ]);

    // Calculate overall summary
    const summary = parishStats.reduce((acc, parish) => {
      acc.totalParishes += 1;
      acc.totalTransactions += parish.totalTransactions;
      acc.totalAmount += parish.totalAmount;
      acc.totalFamilies += parish.uniqueFamiliesCount;
      return acc;
    }, {
      totalParishes: 0,
      totalTransactions: 0,
      totalAmount: 0,
      totalFamilies: 0
    });

    res.json({
      success: true,
      dateRange: {
        startDate: start.toISOString(),
        endDate: end.toISOString()
      },
      summary,
      parishes: parishStats
    });

  } catch (error) {
    console.error('Error fetching parish analysis:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch parish analysis',
      error: error.message
    });
  }
});

/**
 * GET /api/analytics/parish-details/:parishId
 * Get detailed breakdown for a specific parish
 * Query params: startDate, endDate
 */
router.get('/parish-details/:parishId', async (req, res) => {
  try {
    const { parishId } = req.params;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Both startDate and endDate are required'
      });
    }

    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const mongoose = require('mongoose');
    const ObjectId = mongoose.Types.ObjectId;

    // Get parish info
    const parish = await Parish.findById(parishId);

    // Get transactions for this parish
    const transactions = await Transaction.find({
      parish: new ObjectId(parishId),
      date: {
        $gte: start,
        $lte: end
      },
      status: "active"
    }).sort({ date: -1 }).lean();

    // Group by family
    const familyMap = {};
    transactions.forEach(txn => {
      const familyId = txn.family;
      if (!familyMap[familyId]) {
        familyMap[familyId] = {
          familyId,
          transactionCount: 0,
          totalAmount: 0,
          transactions: []
        };
      }
      familyMap[familyId].transactionCount += 1;
      familyMap[familyId].totalAmount += (txn.amountPaid || 0);
      familyMap[familyId].transactions.push({
        date: txn.date,
        amount: txn.amountPaid,
        receiptNumber: txn.receiptNumber
      });
    });

    // Fetch family details
    const familyIds = Object.keys(familyMap);
    const families = await require('../models/Family').find({
      id: { $in: familyIds }
    }).lean();

    const familyInfoMap = {};
    families.forEach(f => {
      familyInfoMap[f.id] = f;
    });

    // Combine data
    const familyDetails = familyIds.map(familyId => {
      const familyData = familyMap[familyId];
      const familyInfo = familyInfoMap[familyId] || {};

      return {
        familyId,
        familyCode: familyInfo.id || familyId,
        familyName: familyInfo.name || 'Unknown',
        transactionCount: familyData.transactionCount,
        totalAmount: familyData.totalAmount,
        recentTransactions: familyData.transactions.slice(0, 5)
      };
    });

    familyDetails.sort((a, b) => b.totalAmount - a.totalAmount);

    // Calculate daily breakdown
    const dailyMap = {};
    transactions.forEach(txn => {
      const dateKey = txn.date.toISOString().split('T')[0];
      if (!dailyMap[dateKey]) {
        dailyMap[dateKey] = {
          date: dateKey,
          transactionCount: 0,
          amount: 0,
          uniqueFamilies: new Set()
        };
      }
      dailyMap[dateKey].transactionCount += 1;
      dailyMap[dateKey].amount += (txn.amountPaid || 0);
      dailyMap[dateKey].uniqueFamilies.add(txn.family);
    });

    const dailyBreakdown = Object.values(dailyMap)
      .map(day => ({
        date: day.date,
        transactionCount: day.transactionCount,
        amount: day.amount,
        uniqueFamiliesCount: day.uniqueFamilies.size
      }))
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    res.json({
      success: true,
      parishInfo: {
        id: parish._id,
        name: parish.name,
        code: parish.code || 'N/A'
      },
      summary: {
        totalTransactions: transactions.length,
        totalAmount: transactions.reduce((sum, t) => sum + (t.amountPaid || 0), 0),
        uniqueFamilies: familyIds.length,
        dateRange: {
          startDate: start.toISOString(),
          endDate: end.toISOString()
        }
      },
      familyDetails,
      dailyBreakdown
    });

  } catch (error) {
    console.error('Error fetching parish details:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch parish details',
      error: error.message
    });
  }
});
/**
 * GET /api/analytics/unique-families-count
 * Count unique families with transactions between dates
 */
/**
 * GET /api/analytics/unique-families-count
 * Count unique families with ACTIVE transactions between dates
 */
router.get('/unique-families-count', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Both startDate and endDate are required'
      });
    }

    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    if (start > end) {
      return res.status(400).json({
        success: false,
        message: 'startDate cannot be after endDate'
      });
    }

    // Count unique families with ACTIVE status transactions
    const uniqueCount = await Transaction.aggregate([
      {
        $match: {
          date: {
            $gte: start,
            $lte: end
          },
          status: "active"
        }
      },
      {
        $group: {
          _id: "$family"
        }
      },
      {
        $count: "totalFamilies"
      }
    ]);

    const totalFamilies = uniqueCount.length > 0 ? uniqueCount[0].totalFamilies : 0;

    // Get detailed stats for ACTIVE transactions
    const detailedStats = await Transaction.aggregate([
      {
        $match: {
          date: {
            $gte: start,
            $lte: end
          },
          status: "active"
        }
      },
      {
        $group: {
          _id: null,
          uniqueFamilies: { $addToSet: "$family" },
          totalTransactions: { $sum: 1 },
          totalAmount: { 
            $sum: { $ifNull: ["$amountPaid", 0] }
          }
        }
      },
      {
        $project: {
          _id: 0,
          uniqueFamiliesCount: { $size: "$uniqueFamilies" },
          totalTransactions: 1,
          totalAmount: 1
        }
      }
    ]);

    res.json({
      success: true,
      dateRange: {
        startDate: start.toISOString(),
        endDate: end.toISOString()
      },
      totalFamilies,
      detailedStats: detailedStats[0] || {
        uniqueFamiliesCount: 0,
        totalTransactions: 0,
        totalAmount: 0
      }
    });

  } catch (error) {
    console.error('Error counting unique families:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to count unique families',
      error: error.message
    });
  }
});

router.get('/families-with-details', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Both startDate and endDate are required'
      });
    }

    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    // Aggregate transactions and lookup family details
    const familiesData = await Transaction.aggregate([
      {
        $match: {
          date: {
            $gte: start,
            $lte: end
          }
        }
      },
      {
        $group: {
          _id: "$family",
          transactionCount: { $sum: 1 },
          totalAmount: { 
            $sum: { $ifNull: ["$amountPaid", 0] }
          },
          firstTransaction: { $min: "$date" },
          lastTransaction: { $max: "$date" },
          parishId: { $first: "$parish" }
        }
      },
      {
        $lookup: {
          from: "families",
          let: { familyId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$id", "$$familyId"] }
              }
            }
          ],
          as: "familyInfo"
        }
      },
      {
        $lookup: {
          from: "parishes",
          localField: "parishId",
          foreignField: "_id",
          as: "parishInfo"
        }
      },
      {
        $project: {
          _id: 0,
          familyId: "$_id",
          familyCode: { 
            $ifNull: [
              { $arrayElemAt: ["$familyInfo.id", 0] },
              "$_id"
            ]
          },
          familyName: {
            $ifNull: [
              { $arrayElemAt: ["$familyInfo.name", 0] },
              "Unknown"
            ]
          },
          parishName: {
            $ifNull: [
              { $arrayElemAt: ["$parishInfo.name", 0] },
              "N/A"
            ]
          },
          transactionCount: 1,
          totalAmount: 1,
          firstTransaction: 1,
          lastTransaction: 1
        }
      },
      {
        // Sort by last transaction date in descending order (most recent first)
        $sort: { lastTransaction: -1, totalAmount: -1 }
      }
    ]);

    res.json({
      success: true,
      dateRange: {
        startDate: start.toISOString(),
        endDate: end.toISOString()
      },
      totalUniqueFamilies: familiesData.length,
      families: familiesData
    });

  } catch (error) {
    console.error('Error fetching families details:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch families details',
      error: error.message
    });
  }
});
router.get('/families-with-details-manual', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Both startDate and endDate are required'
      });
    }

    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    // Get all transactions in date range with active status
    const transactions = await Transaction.find({
      date: {
        $gte: start,
        $lte: end
      },
      status: "active"
    }).lean();

    // Group by family ID manually
    const familyMap = {};

    for (const txn of transactions) {
      const familyId = txn.family;
      
      if (!familyMap[familyId]) {
        familyMap[familyId] = {
          familyId: familyId,
          transactionCount: 0,
          totalAmount: 0,
          lastTransaction: txn.date,
          parishId: txn.parish
        };
      }
      
      familyMap[familyId].transactionCount += 1;
      familyMap[familyId].totalAmount += (txn.amountPaid || 0);
      
      // Keep track of the most recent transaction
      if (txn.date > familyMap[familyId].lastTransaction) {
        familyMap[familyId].lastTransaction = txn.date;
      }
    }

    // Fetch family details for all unique families
    const familyIds = Object.keys(familyMap);
    const families = await Family.find({
      id: { $in: familyIds }
    }).lean();

    // Create a map for quick lookup
    const familyInfoMap = {};
    families.forEach(f => {
      familyInfoMap[f.id] = f;
    });

    // Fetch parish details
    const parishIds = [...new Set(Object.values(familyMap).map(f => f.parishId))];
    const parishes = await require('../models/Parish').find({
      _id: { $in: parishIds }
    }).lean();

    const parishInfoMap = {};
    parishes.forEach(p => {
      parishInfoMap[p._id.toString()] = p;
    });

    // Combine all data
    const familiesData = familyIds.map(familyId => {
      const familyData = familyMap[familyId];
      const familyInfo = familyInfoMap[familyId] || {};
      const parishInfo = parishInfoMap[familyData.parishId?.toString()] || {};

      return {
        familyId: familyId,
        familyCode: familyInfo.id || familyId,
        familyName: familyInfo.name || 'Unknown',
        parishName: parishInfo.name || 'N/A',
        transactionCount: familyData.transactionCount,
        totalAmount: familyData.totalAmount,
        lastTransaction: familyData.lastTransaction
      };
    });

    // Sort by last transaction date (most recent first), then by total amount
    familiesData.sort((a, b) => {
      const dateComparison = new Date(b.lastTransaction) - new Date(a.lastTransaction);
      if (dateComparison !== 0) return dateComparison;
      return b.totalAmount - a.totalAmount;
    });

    res.json({
      success: true,
      dateRange: {
        startDate: start.toISOString(),
        endDate: end.toISOString()
      },
      totalUniqueFamilies: familiesData.length,
      families: familiesData
    });

  } catch (error) {
    console.error('Error fetching families details:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch families details',
      error: error.message
    });
  }
});
module.exports = router;