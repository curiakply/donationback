const Transaction = require("../models/Transaction");
const Person = require("../models/Person");
const Parish = require("../models/Parish");
const Families = require("../models/Family");
const koottaymas = require("../models/Koottayma");
const TotalAmount = require('../models/TotalAmount');
const TransactionAudit = require('../models/TransactionAudit');
const AuditLogger = require('../middleware/auditLogger');
const mongoose = require("mongoose");
const getUserInfo = (req) => {
  return {
    id: req.user?.id || 'unknown',
    name: req.user?.name || 'Unknown User',
    email: req.user?.email || 'unknown@email.com'
  };
};
async function getAllFamilyTransactions(req, res) {
  try {
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error fetching family transactions" });
  }
}

const calculateTranParishTotal = async (req, res) => {
  try {
      const { year } = req.params;
      const yearNum = parseInt(year);
      const startDate = new Date(`${yearNum}-04-01`);
      const endDate = new Date(`${yearNum + 1}-03-31`);

      // Single aggregation pipeline to get all parishes and their totals
      const parishTotals = await Parish.aggregate([
          // Start with all parishes
          {
              $lookup: {
                  from: 'transactions',
                  let: { parishId: '$_id' },
                  pipeline: [
                      {
                          $match: {
                              $expr: {
                                  $and: [
                                      { $eq: ['$parish', '$$parishId'] },
                                      { $eq: ['$status', 'active'] },
                                      { $gte: ['$date', startDate] },
                                      { $lte: ['$date', endDate] }
                                  ]
                              }
                          }
                      },
                      {
                          $group: {
                              _id: null,
                              totalAmount: { $sum: '$amountPaid' }
                          }
                      }
                  ],
                  as: 'transactionStats'
              }
          },
          // Project only needed fields
          {
              $project: {
                  name: 1,
                  totalAmount: {
                      $cond: {
                          if: { $gt: [{ $size: '$transactionStats' }, 0] },
                          then: { $arrayElemAt: ['$transactionStats.totalAmount', 0] },
                          else: 0
                      }
                  }
              }
          },
          // Sort by parish name
          {
              $sort: { name: 1 }
          },
          // Add error handling in case of null values
          {
              $project: {
                  name: 1,
                  totalAmount: { $ifNull: ['$totalAmount', 0] }
              }
          }
      ]);

      res.status(200).json(parishTotals);

  } catch (error) {
      console.error('Error calculating parish totals:', {
          message: error.message,
          stack: error.stack
      });
      
      res.status(500).json({
          message: "Error calculating parish totals",
          error: error.message,
          ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
      });
  }
};

async function getTransactionsByYear(req, res) {
  try {
    const familyId = req.params.familyId;

    const transactionsByYear = await Transaction.aggregate([
      {
        $match: {
          family: familyId,
        },
      },
      {
        $addFields: {
          financialYear: {
            $switch: {
              branches: [
                {
                  // April to December - Current Year
                  case: {
                    $and: [
                      { $gte: [{ $month: "$date" }, 4] },
                      { $lte: [{ $month: "$date" }, 12] }
                    ]
                  },
                  then: { $year: "$date" }
                },
                {
                  // January to March - Previous Year
                  case: {
                    $and: [
                      { $gte: [{ $month: "$date" }, 1] },
                      { $lte: [{ $month: "$date" }, 3] }
                    ]
                  },
                  then: { $subtract: [{ $year: "$date" }, 1] }
                }
              ],
              default: { $year: "$date" }
            }
          }
        },
      },
      {
        $group: {
          _id: "$financialYear",
          totalAmountPaid: { $sum: "$amountPaid" },
          startYear: { $first: "$financialYear" },
        },
      },
      {
        $project: {
          _id: 0,
          financialYear: {
            $concat: [
              { $toString: "$startYear" },
              "-",
              { $toString: { $subtract: [{ $add: ["$startYear", 1] }, 2000] } }
            ]
          },
          totalAmountPaid: 1
        }
      },
      {
        $sort: { financialYear: 1 },
      },
    ]);

    res.status(200).json(transactionsByYear);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      message: "An error occurred while fetching total sum of transactions by year.",
    });
  }
}

async function calculateYearlyDataTotal(req, res) {
  try {
    const stats = await Transaction.aggregate([
      {
        $addFields: {
          financialYear: {
            $switch: {
              branches: [
                {
                  // April to December - Current Year
                  case: {
                    $and: [
                      { $gte: [{ $month: "$date" }, 4] },
                      { $lte: [{ $month: "$date" }, 12] }
                    ]
                  },
                  then: { $year: "$date" }
                },
                {
                  // January to March - Previous Year
                  case: {
                    $and: [
                      { $gte: [{ $month: "$date" }, 1] },
                      { $lte: [{ $month: "$date" }, 3] }
                    ]
                  },
                  then: { $subtract: [{ $year: "$date" }, 1] }
                }
              ],
              default: { $year: "$date" }
            }
          }
        }
      },
      {
        $group: {
          _id: "$financialYear",
          totalAmount: { $sum: "$amountPaid" },
          totalParticipants: { $sum: 1 },
          startYear: { $first: "$financialYear" }
        }
      },
      {
        $project: {
          _id: 0,
          financialYear: {
            $concat: [
              { $toString: "$startYear" },
              "-",
              { $toString: { $subtract: [{ $add: ["$startYear", 1] }, 2000] } }
            ]
          },
          year: "$startYear",
          totalAmount: 1,
          totalParticipants: 1
        }
      },
      {
        $sort: { year: 1 }
      }
    ]);

    if (!stats || stats.length === 0) {
      return res.status(404).json({ message: "No data found." });
    }

    res.status(200).json(stats);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "An error occurred while calculating yearly totals." });
  }
}
async function calculateYearlyDatasum(req, res) {
  try {
    const { year } = req.params;
    const parsedYear = parseInt(year, 10);

    if (isNaN(parsedYear)) {
      return res.status(400).json({ message: "Invalid year parameter" });
    }

    // Calculate financial year dates
    const startDate = new Date(`${parsedYear}-04-01`);
    const endDate = new Date(`${parsedYear + 1}-03-31`);

    // Get transactions data
    const transactionStats = await Transaction.aggregate([
      {
        $match: {
          date: { $gte: startDate, $lte: endDate },
          status: "active"
        }
      },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: "$amountPaid" },
          parishCount: { $addToSet: "$parish" },
          foraneCount: { $addToSet: "$forane" },
          familyCount: { $addToSet: "$family" }
        }
      },
      {
        $project: {
          _id: 0,
          totalAmount: 1,
          parishCount: { $size: "$parishCount" },
          foraneCount: { $size: "$foraneCount" },
          familyCount: { $size: "$familyCount" }
        }
      }
    ]);

    // Get total amounts data
    const totalAmountsData = await TotalAmount.findOne({ year }).lean();

    // Combine the data
    const result = {
      year: parsedYear,
      // Transaction statistics
      collectedAmount: transactionStats[0]?.totalAmount || 0,
      parishCount: transactionStats[0]?.parishCount || 0,
      foraneCount: transactionStats[0]?.foraneCount || 0,
      familyCount: transactionStats[0]?.familyCount || 0,
      
      // Total amounts data
      total_amount: totalAmountsData?.total_amount || 0,
      total_allocated: totalAmountsData?.total_allocated || 0,
      remaining_amount: (totalAmountsData?.total_amount || 0) - (totalAmountsData?.total_allocated || 0),
      parish_percentage: totalAmountsData?.parish_percentage || 0,
      parish_amount: totalAmountsData?.parish_amount || 0,
      other_projects_percentage: totalAmountsData?.other_projects_percentage || 0,
      other_projects_amount: totalAmountsData?.other_projects_amount || 0,
      balance_after_community: totalAmountsData?.balance_after_community || 0
    };

    res.status(200).json(result);

  } catch (err) {
    console.error('Error in calculateYearlyData:', err);
    res.status(500).json({ 
      message: "An error occurred while calculating yearly stats.",
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
}

async function calculateYearlyData(req, res) {
  try {
    const { year } = req.params; // Get year from URL parameter
    const parsedYear = parseInt(year, 10);

    if (isNaN(parsedYear)) {
      return res.status(400).json({ message: "Invalid year parameter" });
    }

    // Aggregate data for the selected year
    const stats = await Transaction.aggregate([
      {
        $match: {
          // Match only transactions for the selected year
          date: {
            $gte: new Date(`${parsedYear}-04-01`),  // Start of financial year (April 1st)
            $lte: new Date(`${parsedYear + 1}-03-31`)  // End of financial year (March 31st next year)
          },
          status: "active"
        },
      },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: "$amountPaid" },
          parishCount: { $addToSet: "$parish" },
          foraneCount: { $addToSet: "$forane" },
          familyCount: { $addToSet: "$family" },
        },
      },
      {
        $project: {
          _id: 0,
          totalAmount: 1,
          parishCount: { $size: "$parishCount" },
          foraneCount: { $size: "$foraneCount" },
          familyCount: { $size: "$familyCount" },
        },
      },
    ]);

    if (!stats || stats.length === 0) {
      return res.status(404).json({ message: "No data found for the selected year" });
    }

    const result = stats[0];
    res.status(200).json({
      totalAmount: result.totalAmount || 0,
      parishCount: result.parishCount || 0,
      foraneCount: result.foraneCount || 0,
      familyCount: result.familyCount || 0,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "An error occurred while calculating yearly stats." });
  }
}


async function calculateYearlyDataByForane(req, res) {
  try {
    const { year, foraneId } = req.params;
    const parsedYear = parseInt(year, 10);

    if (isNaN(parsedYear)) {
      return res.status(400).json({ message: "Invalid year parameter" });
    }

    // Ensure foraneId is a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(foraneId)) {
      return res.status(400).json({ message: "Invalid foraneId parameter" });
    }

    console.log("Forane ID:", foraneId);  // Logging for debugging
    console.log("Parsed Year:", parsedYear);

    const stats = await Transaction.aggregate([
      {
        $match: {
          forane: new mongoose.Types.ObjectId(foraneId), // Using 'new' to correctly instantiate ObjectId
          date: {
            $gte: new Date(`${parsedYear}-04-01`),  // Start of financial year (April 1st)
            $lte: new Date(`${parsedYear + 1}-03-31`)  // End of financial year (March 31st next year)
          },
          status: "active" // ✅ Added active status filter
        },
      },
      {
        $group: {
          _id: { forane: "$forane", parish: "$parish" },
          totalAmount: { $sum: "$amountPaid" },
        },
      },
      {
        $sort: { "_id.forane": 1, "_id.parish": 1 },
      },
    ]);

    if (!stats || stats.length === 0) {
      return res.status(404).json({ message: "No data found for the selected year and forane" });
    }

    const result = stats.map((item) => ({
      forane: item._id.forane,
      parish: item._id.parish,
      totalAmount: item.totalAmount,
    }));

    res.status(200).json(result);
  } catch (err) {
    console.error("Error details:", err);  // Log the full error
    res.status(500).json({ 
      message: "An error occurred while calculating yearly stats by forane and parish.",
      error: err.message  // Include the error message for more context
    });
  }
}


async function getLatestTransaction(req, res) {
  try {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();

    const transaction = await Transaction.findOne({
      person: req.params.personid,
      date: {
        $gte: new Date(`${currentYear}-04-01`),  // Start of financial year (April 1st)
        $lte: new Date(`${currentYear + 1}-03-31`)  // End of financial year (March 31st next year)
      }
    })
      .sort({ createdAt: -1 }) // Sort by createdAt in descending order
      .exec();
      
    console.log("Transaction retrieved:", transaction);

    if (!transaction) {
      return res
        .status(404)
        .json({ message: "No transactions found for this person" });
    }

    // Ensure the 'amountPaid' exists in the returned transaction
    if (typeof transaction.amountPaid === "undefined") {
      console.warn("Transaction found but 'amountPaid' is undefined:", transaction);
      return res.status(500).json({ message: "'amountPaid' is missing in the transaction" });
    }

    return res.status(200).json(transaction);
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ message: "Cannot get person's latest transaction." });
  }
}

const getTransferredTransaction = async (req, res) => {
  try {
    const { personId, year } = req.params;
    
    // Convert year to date range
    const startDate = new Date(year, 4, 1); 
    const endDate = new Date(year+1, 3, 31); 

    // Find transferred transaction
    const transaction = await Transaction.findOne({
      originalPerson: personId,
      date: {
        $gte: startDate,
        $lte: endDate
      },
      isTransferred: true,
      status: 'transferred'
    });

    if (!transaction) {
      return res.status(404).json({ 
        message: 'No transferred transaction found for this person in the specified year' 
      });
    }

    res.json(transaction);
  } catch (error) {
    console.error('Error fetching transferred transaction:', error);
    res.status(500).json({ 
      message: 'Error fetching transferred transaction', 
      error: error.message 
    });
  }
};


// async function createNewTransaction(req, res) {
//   try {
//     const newTransaction = new Transaction(req.body);
//     await newTransaction.save();
//     res.status(201).json({ message: "Transaction successfully recorded." });
//   } catch (err) {
//     console.error(err.message);
//     res.status(500).json({ message: err.message });
//   }
// }
async function createNewTransaction(req, res) {
  try {
    const userInfo = getUserInfo(req);
    
    const newTransaction = new Transaction(req.body);
    await newTransaction.save();
    
    // Log the creation
    await AuditLogger.logCreate(newTransaction._id, userInfo, req, {
      originalRequest: req.body
    });
    
    res.status(201).json({ 
      message: "Transaction successfully recorded.",
      transactionId: newTransaction._id
    });
  } catch (err) {
    console.error('Create transaction error:', err);
    res.status(500).json({ message: err.message });
  }
}
async function calculateForaneTotal(req, res) {
  try {
    const total = await Transaction.aggregate([
      { $match: { forane: new mongoose.Types.ObjectId(req.params.foraneid) } },
      { $group: { _id: null, totalAmount: { $sum: "$amountPaid" } } },
    ]);
    res.status(200).json({ totalAmount: total[0]?.totalAmount || 0 });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      message:
        "An error occurred while calculating the total amount for the Forane.",
    });
  }
}

async function calculateParishTotal(req, res) {
  try {
    const total = await Transaction.aggregate([
      { $match: { parish: new mongoose.Types.ObjectId(req.params.parishid) } },
      { $group: { _id: null, totalAmount: { $sum: "$amountPaid" } } },
    ]);
    res.status(200).json({ totalAmount: total[0]?.totalAmount || 0 });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      message:
        "An error occurred while calculating the total amount for the Parish.",
    });
  }
}

async function calculateFamilyTotal(req, res) {
  try {
    const total = await Transaction.aggregate([
      { $match: { family: req.params.familyid } },
      { $group: { _id: null, totalAmount: { $sum: "$amountPaid" } } },
    ]);
    res.status(200).json({ totalAmount: total[0]?.totalAmount || 0 });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      message:
        "An error occurred while calculating the total amount for the Family.",
    });
  }
}

async function calculatePersonTotal(req, res) {
  try {
    const total = await Transaction.aggregate([
      { $match: { person: new mongoose.Types.ObjectId(req.params.personid) } },
      { $group: { _id: null, totalAmount: { $sum: "$amountPaid" } } },
    ]);
    res.status(200).json({ totalAmount: total[0]?.totalAmount || 0 });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      message:
        "An error occurred while calculating the total amount for the Person.",
    });
  }
}
async function getPersonByYear(req, res) {
  try {
    const { personid, year } = req.params;
    const yearNum = parseInt(year);
   
    // Find all transactions for the person in the specific year
    const transactions = await Transaction.find({ 
      person: personid, 
      date: { 
        $gte: new Date(`${yearNum}-04-01`), 
        $lte: new Date(`${yearNum+1}-03-31`) 
      }
    });
     console.log(transactions);
    // Calculate total amount for the year
    const totalAmount = transactions.reduce((sum, transaction) => sum + transaction.amountPaid, 0);
    
    res.status(200).json({ 
      transactions, 
      totalAmount 
    });
  } catch (error) {
    res.status(500).json({ error: "An error occurred while fetching transactions by year." });
  }
}
async function getAllPersonTransactions(req, res) {
  try {
    const transactions = await Transaction.find({
      person: req.params.personId
    }).sort({ date: -1 });

    res.json({
      transactions,
      count: transactions.length
    });
  } catch (error) {
    res.status(500).json({ message: "Error fetching transactions" });
  }
}

async function getTransactionAuditLogs(req, res) {
  try {
    const { transactionId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    
    const skip = (page - 1) * limit;
    
    const auditLogs = await TransactionAudit.find({ transactionId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('userId', 'name email')
      .populate('personId', 'name')
      .populate('parishId', 'name');
    
    const total = await TransactionAudit.countDocuments({ transactionId });
    
    res.json({
      auditLogs,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalRecords: total,
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({ message: 'Error fetching audit logs' });
  }
}

// Get audit logs for a specific user
async function getUserAuditLogs(req, res) {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 50, action, startDate, endDate } = req.query;
    
    const skip = (page - 1) * limit;
    const filter = { userId };
    
    // Add action filter if provided
    if (action && action !== 'all') {
      filter.action = action;
    }
    
    // Add date range filter if provided
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }
    
    const auditLogs = await TransactionAudit.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('transactionId')
      .populate('personId', 'name')
      .populate('parishId', 'name');
    
    const total = await TransactionAudit.countDocuments(filter);
    
    res.json({
      auditLogs,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalRecords: total,
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Error fetching user audit logs:', error);
    res.status(500).json({ message: 'Error fetching user audit logs' });
  }
}

// Get audit summary/statistics
async function getAuditSummary(req, res) {
  try {
    const { startDate, endDate, userId } = req.query;
    
    const matchStage = {};
    if (startDate || endDate) {
      matchStage.createdAt = {};
      if (startDate) matchStage.createdAt.$gte = new Date(startDate);
      if (endDate) matchStage.createdAt.$lte = new Date(endDate);
    }
    if (userId) {
      matchStage.userId = new mongoose.Types.ObjectId(userId);
    }
    
    const summary = await TransactionAudit.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: {
            action: '$action',
            userId: '$userId',
            userName: '$userName'
          },
          count: { $sum: 1 },
          totalAmount: { $sum: { $ifNull: ['$amount', 0] } }
        }
      },
      {
        $group: {
          _id: '$_id.userId',
          userName: { $first: '$_id.userName' },
          actions: {
            $push: {
              action: '$_id.action',
              count: '$count',
              totalAmount: '$totalAmount'
            }
          },
          totalOperations: { $sum: '$count' }
        }
      },
      { $sort: { totalOperations: -1 } }
    ]);
    
    res.json({
      summary,
      period: { startDate, endDate }
    });
  } catch (error) {
    console.error('Error fetching audit summary:', error);
    res.status(500).json({ message: 'Error fetching audit summary' });
  }
}


// async function transferTransaction(req, res) {
//   try {
//     const {
//       fromPerson,
//       toPerson,
//       forane,
//       parish,
//       family,
//       status,
//       reason,
//       amount,
//       date
//     } = req.body;

//     // Find existing transaction
//     const existingTransaction = await Transaction.findOne({
//       person: fromPerson,
//       date: {
//         $gte: new Date(new Date().getFullYear(), 4, 1),
//         $lte: new Date(new Date().getFullYear(), 3, 31)
//       }
      
//     });

//     if (!existingTransaction) {
//       // Create new transaction for head if no existing transaction
//       const newTransaction = new Transaction({
//         forane,
//         parish,
//         family,
//         person: toPerson,
//         amountPaid: amount,
//         date,
//         originalPerson: fromPerson,
//         isTransferred: true,
//         transferReason: reason,
//         transferDate: new Date(),
//         status: 'transferred',
//         transferHistory: [{
//           fromPerson,
//           toPerson,
//           reason,
//           status,
//           transferDate: new Date()
//         }]
//       });

//       await newTransaction.save();
//       return res.json({
//         message: 'New transaction created for head',
//         transaction: newTransaction
//       });
//     }

//     // If existing transaction, transfer it
//     existingTransaction.person = toPerson;
//     existingTransaction.isTransferred = true;
//     existingTransaction.transferReason = reason;
//     existingTransaction.transferDate = new Date();
//     existingTransaction.status = 'transferred';
//     existingTransaction.transferHistory.push({
//       fromPerson,
//       toPerson,
//       reason,
//       status,
//       transferDate: new Date()
//     });

//     await existingTransaction.save();

//     res.json({
//       message: 'Transaction transferred successfully',
//       transaction: existingTransaction
//     });

//   } catch (error) {
//     console.error('Transfer error:', error);
//     res.status(500).json({
//       message: error.message || 'Failed to transfer transaction'
//     });
//   }
// }

async function transferTransaction(req, res) {
  try {
    const userInfo = getUserInfo(req);
    const {
      fromPerson,
      toPerson,
      forane,
      parish,
      family,
      status,
      reason,
      amount,
      date
    } = req.body;

    // Find existing transaction
    const existingTransaction = await Transaction.findOne({
      person: fromPerson,
      date: {
        $gte: new Date(new Date().getFullYear(), 4, 1),
        $lte: new Date(new Date().getFullYear(), 3, 31)
      }
    });

    let resultTransaction;

    if (!existingTransaction) {
      // Create new transaction for head if no existing transaction
      const newTransaction = new Transaction({
        forane,
        parish,
        family,
        person: toPerson,
        amountPaid: amount,
        date,
        originalPerson: fromPerson,
        isTransferred: true,
        transferReason: reason,
        transferDate: new Date(),
        status: 'transferred',
        transferHistory: [{
          fromPerson,
          toPerson,
          reason,
          status,
          transferDate: new Date()
        }]
      });

      resultTransaction = await newTransaction.save();
      
      // Log the transfer
      await AuditLogger.logTransfer(resultTransaction._id, userInfo, {
        fromPerson,
        toPerson,
        family,
        amount,
        reason,
        status
      }, req);

      return res.json({
        message: 'New transaction created for head',
        transaction: resultTransaction
      });
    }

    // If existing transaction, transfer it
    const oldTransactionData = existingTransaction.toObject();
    
    existingTransaction.person = toPerson;
    existingTransaction.isTransferred = true;
    existingTransaction.transferReason = reason;
    existingTransaction.transferDate = new Date();
    existingTransaction.status = 'transferred';
    existingTransaction.transferHistory.push({
      fromPerson,
      toPerson,
      reason,
      status,
      transferDate: new Date()
    });

    resultTransaction = await existingTransaction.save();
    
    // Log the transfer
    await AuditLogger.logTransfer(resultTransaction._id, userInfo, {
      fromPerson,
      toPerson,
      family,
      amount: existingTransaction.amountPaid,
      reason,
      status
    }, req);

    res.json({
      message: 'Transaction transferred successfully',
      transaction: resultTransaction
    });

  } catch (error) {
    console.error('Transfer error:', error);
    res.status(500).json({
      message: error.message || 'Failed to transfer transaction'
    });
  }
}


// async function updateTransaction(req, res) {
//   try {
//     const transaction = await Transaction.findByIdAndUpdate(
//       req.params.transactionId,
//       req.body,
//       { new: true }
//     );
    
//     if (!transaction) {
//       return res.status(404).json({ message: "Transaction not found." });
//     }
    
//     res.status(200).json(transaction);
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ message: "Error updating transaction." });
//   }
// }
async function updateTransaction(req, res) {
  try {
    const userInfo = getUserInfo(req);
    const transactionId = req.params.transactionId;
    
    // Get the old transaction data for comparison
    const oldTransaction = await Transaction.findById(transactionId);
    if (!oldTransaction) {
      return res.status(404).json({ message: "Transaction not found." });
    }
    
    // Store old data for audit
    const oldData = oldTransaction.toObject();
    
    // Update the transaction
    const updatedTransaction = await Transaction.findByIdAndUpdate(
      transactionId,
      req.body,
      { new: true }
    );
    
    // Log the update
    await AuditLogger.logUpdate(
      transactionId, 
      userInfo, 
      oldData, 
      updatedTransaction.toObject(), 
      req
    );
    
    res.status(200).json({
      message: "Transaction updated successfully",
      transaction: updatedTransaction
    });
  } catch (err) {
    console.error('Update transaction error:', err);
    res.status(500).json({ message: "Error updating transaction." });
  }
}
// const deleteTransaction = async (req, res) => {
//   try {
//     const { id } = req.params;

//     // Validate that the ID is a valid MongoDB ObjectId
//     if (!mongoose.Types.ObjectId.isValid(id)) {
//       return res.status(400).json({ 
//         message: 'Invalid transaction ID format' 
//       });
//     }

//     // Find and delete the transaction
//     const deletedTransaction = await Transaction.findByIdAndDelete(id);

//     if (!deletedTransaction) {
//       return res.status(404).json({ 
//         message: 'Transaction not found' 
//       });
//     }

//     // If the transaction was transferred, you might want to update related records
//     if (deletedTransaction.isTransferred) {
//       // Update the current person's total amount if needed
//       await Person.findByIdAndUpdate(
//         deletedTransaction.person,
//         { $inc: { totalAmount: -deletedTransaction.amountPaid } }
//       );

//       // If there was an original person, update their records too
//       if (deletedTransaction.originalPerson) {
//         await Person.findByIdAndUpdate(
//           deletedTransaction.originalPerson,
//           { $inc: { totalAmount: deletedTransaction.amountPaid } }
//         );
//       }
//     }

//     res.json({ 
//       message: 'Transaction deleted successfully',
//       deletedTransaction 
//     });

//   } catch (error) {
//     console.error('Error deleting transaction:', error);
//     res.status(500).json({ 
//       message: 'Error deleting transaction', 
//       error: error.message 
//     });
//   }
// };
const deleteTransaction = async (req, res) => {
  try {
    const userInfo = getUserInfo(req);
    const { id } = req.params;

    // Validate that the ID is a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ 
        message: 'Invalid transaction ID format' 
      });
    }

    // Find the transaction before deleting (for audit log)
    const transactionToDelete = await Transaction.findById(id);
    if (!transactionToDelete) {
      return res.status(404).json({ 
        message: 'Transaction not found' 
      });
    }

    // Store transaction data for audit
    const transactionData = transactionToDelete.toObject();

    // Delete the transaction
    const deletedTransaction = await Transaction.findByIdAndDelete(id);

    // Log the deletion
    await AuditLogger.logDelete(transactionData, userInfo, req);

    // If the transaction was transferred, you might want to update related records
    if (deletedTransaction.isTransferred) {
      // Update the current person's total amount if needed
      await Person.findByIdAndUpdate(
        deletedTransaction.person,
        { $inc: { totalAmount: -deletedTransaction.amountPaid } }
      );

      // If there was an original person, update their records too
      if (deletedTransaction.originalPerson) {
        await Person.findByIdAndUpdate(
          deletedTransaction.originalPerson,
          { $inc: { totalAmount: deletedTransaction.amountPaid } }
        );
      }
    }

    res.json({ 
      message: 'Transaction deleted successfully',
      deletedTransaction 
    });

  } catch (error) {
    console.error('Error deleting transaction:', error);
    res.status(500).json({ 
      message: 'Error deleting transaction', 
      error: error.message 
    });
  }
};
// const getKoottaymaWiseTitheInfo = async (req, res) => {
//   try {
//     const { parishId } = req.params;
//     const currentYear = new Date().getFullYear();
//     const startDate = new Date(`${currentYear}-04-01`);
//     const endDate = new Date(`${currentYear + 1}-03-31`);

//     const pipeline = [
//       // Start with koottaymas
//       {
//         $match: {
//           parish: new mongoose.Types.ObjectId(parishId)
//         }
//       },
//       // Lookup families in each koottayma
//       {
//         $lookup: {
//           from: 'families',
//           localField: '_id',
//           foreignField: 'koottayma',
//           as: 'families'
//         }
//       },
//       // Unwind families to process each
//       {
//         $unwind: {
//           path: '$families',
//           preserveNullAndEmptyArrays: true
//         }
//       },
//       // Lookup head of each family
//       {
//         $lookup: {
//           from: 'people',
//           localField: 'families.head',
//           foreignField: '_id',
//           as: 'headInfo'
//         }
//       },
//       {
//         $unwind: {
//           path: '$headInfo',
//           preserveNullAndEmptyArrays: true
//         }
//       },
//       // Lookup transactions for each family (excluding transfers)
//       {
//         $lookup: {
//           from: 'transactions',
//           let: { 
//             familyId: { $toString: '$families.id' },
//             startDate: startDate,
//             endDate: endDate
//           },
//           pipeline: [
//             {
//               $match: {
//                 $expr: {
//                   $and: [
//                     { $eq: ['$family', '$$familyId'] },
//                     { $gte: ['$date', '$$startDate'] },
//                     { $lte: ['$date', '$$endDate'] },
//                     // Exclude transferred amounts
//                     { $or: [
//                         { $eq: ['$isTransferred', false] },
//                         { $eq: ['$isTransferred', null] },
//                         { $not: { $ifNull: ['$isTransferred', false] } }
//                       ]
//                     }
//                   ]
//                 }
//               }
//             },
//             {
//               $lookup: {
//                 from: 'people',
//                 localField: 'person',
//                 foreignField: '_id',
//                 as: 'memberInfo'
//               }
//             },
//             {
//               $unwind: {
//                 path: '$memberInfo',
//                 preserveNullAndEmptyArrays: true
//               }
//             }
//           ],
//           as: 'transactions'
//         }
//       },
//       // Add calculated fields for family totals
//       {
//         $addFields: {
//           familyTransactionTotal: {
//             $sum: '$transactions.amountPaid'
//           },
//           familyMembers: {
//             $map: {
//               input: '$transactions',
//               as: 'txn',
//               in: {
//                 memberName: '$$txn.memberInfo.name',
//                 amount: '$$txn.amountPaid'
//               }
//             }
//           }
//         }
//       },
//       // Group back to family level
//       {
//         $group: {
//           _id: {
//             koottaymaId: '$_id',
//             familyId: '$families.id'
//           },
//           koottaymaName: { $first: '$name' },
//           houseName: { $first: '$families.name' },
//           phone: { $first: '$families.phone' },
//           headName: { $first: '$headInfo.name' },
//           members: { $first: '$familyMembers' },
//           totalFamilyAmount: { $first: '$familyTransactionTotal' }
//         }
//       },
//       // Sort families by name within each koottayma
//       {
//         $sort: { 
//           koottaymaName: 1,  // First by koottayma name
//           houseName: 1       // Then by family/house name
//         }
//       },
//       // Group by koottayma
//       {
//         $group: {
//           _id: '$_id.koottaymaId',
//           name: { $first: '$koottaymaName' },
//           families: {
//             $push: {
//               familyId: '$_id.familyId',
//               houseName: '$houseName',
//               phone: '$phone',
//               headName: { $ifNull: ['$headName', 'No Head Assigned'] },
//               members: { $ifNull: ['$members', []] },
//               totalAmount: { $ifNull: ['$totalFamilyAmount', 0] }
//             }
//           },
//           totalAmount: { $sum: { $ifNull: ['$totalFamilyAmount', 0] } }
//         }
//       },
//       // Add field to extract numeric prefix for proper sorting with error handling
//       {
//         $addFields: {
//           // Extract the first part before dot, then the first word
//           firstPart: {
//             $arrayElemAt: [
//               { $split: ["$name", "."] },
//               0
//             ]
//           }
//         }
//       },
//       {
//         $addFields: {
//           // Extract the first word from the first part
//           firstWord: {
//             $arrayElemAt: [
//               { $split: ["$firstPart", " "] },
//               0
//             ]
//           }
//         }
//       },
//       {
//         $addFields: {
//           // Try to convert to number, use 0 if conversion fails
//           numericPrefix: {
//             $convert: {
//               input: "$firstWord",
//               to: "int",
//               onError: 0,  // Use 0 if conversion fails
//               onNull: 0    // Use 0 if input is null
//             }
//           },
//           // Create a flag to identify if the first word is numeric
//           isNumeric: {
//             $regexMatch: {
//               input: "$firstWord",
//               regex: "^[0-9]+$"  // Only digits
//             }
//           }
//         }
//       },
//       // Sort by numeric prefix first for numeric entries, then by name
//       {
//         $sort: { 
//           isNumeric: -1,      // Numeric entries first (true = 1, false = 0, so -1 puts true first)
//           numericPrefix: 1,   // Then by numeric value for numeric entries
//           name: 1             // Then alphabetically for non-numeric entries
//         }
//       },
//       // Remove the temporary fields
//       {
//         $project: {
//           firstPart: 0,
//           firstWord: 0,
//           numericPrefix: 0,
//           isNumeric: 0
//         }
//       }
//     ];

//     const titheInfo = await koottaymas.aggregate(pipeline);

//     if (!titheInfo || titheInfo.length === 0) {
//       return res.status(200).json([]);
//     }

//     res.status(200).json(titheInfo);

//   } catch (error) {
//     console.error('Error in getKoottaymaWiseTitheInfo:', error);
//     res.status(500).json({ message: error.message });
//   }
// };
const getKoottaymaWiseTitheInfo = async (req, res) => {
  try {
    const { parishId } = req.params;
    const currentYear = new Date().getFullYear();
    const startDate = new Date(`${currentYear}-04-01`);
    const endDate = new Date(`${currentYear + 1}-03-31`);

    const pipeline = [
      // Start with koottaymas
      {
        $match: {
          parish: new mongoose.Types.ObjectId(parishId)
        }
      },
      // Add field to extract numeric prefix for koottayma sorting
      {
        $addFields: {
          // Extract the first part before dot, then the first word
          koottaymaFirstPart: {
            $arrayElemAt: [
              { $split: ["$name", "."] },
              0
            ]
          }
        }
      },
      {
        $addFields: {
          // Extract the first word from the first part
          koottaymaFirstWord: {
            $arrayElemAt: [
              { $split: ["$koottaymaFirstPart", " "] },
              0
            ]
          }
        }
      },
      {
        $addFields: {
          // Try to convert to number, use 0 if conversion fails
          koottaymaNumericPrefix: {
            $convert: {
              input: "$koottaymaFirstWord",
              to: "int",
              onError: 0,  // Use 0 if conversion fails
              onNull: 0    // Use 0 if input is null
            }
          },
          // Create a flag to identify if the first word is numeric
          koottaymaIsNumeric: {
            $regexMatch: {
              input: "$koottaymaFirstWord",
              regex: "^[0-9]+$"  // Only digits
            }
          }
        }
      },
      // Sort koottaymas first
      {
        $sort: { 
          koottaymaIsNumeric: -1,      // Numeric entries first
          koottaymaNumericPrefix: 1,   // Then by numeric value for numeric entries
          name: 1                      // Then alphabetically for non-numeric entries
        }
      },
      // Lookup families in each koottayma
      {
        $lookup: {
          from: 'families',
          localField: '_id',
          foreignField: 'koottayma',
          as: 'families'
        }
      },
      // Unwind families to process each
      {
        $unwind: {
          path: '$families',
          preserveNullAndEmptyArrays: true
        }
      },
      // Lookup head of each family - specifically looking for relation "head"
      {
        $lookup: {
          from: 'people',
          let: { familyId: { $toString: '$families.id' } },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$family', '$$familyId'] },
                    { $eq: ['$relation', 'head'] },
                    { $eq: ['$status', 'active'] } // Only active heads
                  ]
                }
              }
            }
          ],
          as: 'headInfo'
        }
      },
      {
        $unwind: {
          path: '$headInfo',
          preserveNullAndEmptyArrays: true
        }
      },
      // Lookup transactions for each family (excluding transfers)
      {
        $lookup: {
          from: 'transactions',
          let: { 
            familyId: { $toString: '$families.id' },
            startDate: startDate,
            endDate: endDate
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$family', '$$familyId'] },
                    { $gte: ['$date', '$$startDate'] },
                    { $lte: ['$date', '$$endDate'] },
                    // Exclude transferred amounts
                    { $or: [
                        { $eq: ['$isTransferred', false] },
                        { $eq: ['$isTransferred', null] },
                        { $not: { $ifNull: ['$isTransferred', false] } }
                      ]
                    }
                  ]
                }
              }
            },
            {
              $lookup: {
                from: 'people',
                localField: 'person',
                foreignField: '_id',
                as: 'memberInfo'
              }
            },
            {
              $unwind: {
                path: '$memberInfo',
                preserveNullAndEmptyArrays: true
              }
            }
          ],
          as: 'transactions'
        }
      },
      // Add calculated fields for family totals
      {
        $addFields: {
          familyTransactionTotal: {
            $sum: '$transactions.amountPaid'
          },
          familyMembers: {
            $map: {
              input: '$transactions',
              as: 'txn',
              in: {
                memberName: '$$txn.memberInfo.name',
                amount: '$$txn.amountPaid'
              }
            }
          }
        }
      },
      // Group back to family level
      {
        $group: {
          _id: {
            koottaymaId: '$_id',
            familyId: '$families.id'
          },
          koottaymaName: { $first: '$name' },
          koottaymaNumericPrefix: { $first: '$koottaymaNumericPrefix' }, // Preserve sorting info
          familyId: { $first: '$families.id' }, // Add family id
          familyNumber: { $first: '$families.familyNumber' }, // Add family number
          houseName: { $first: '$families.name' },
          phone: { $first: '$families.phone' },
          headName: { $first: '$headInfo.name' },
          members: { $first: '$familyMembers' },
          totalFamilyAmount: { $first: '$familyTransactionTotal' }
        }
      },
      // Sort families by house name and head name within each koottayma (after we have all family data)
      {
        $sort: { 
          koottaymaNumericPrefix: 1,  // Maintain koottayma order
          houseName: 1,               // Sort families by house name first
          headName: 1                 // Then by head name
        }
      },
      // Group by koottayma (maintain the sorting)
      {
        $group: {
          _id: '$_id.koottaymaId',
          name: { $first: '$koottaymaName' },
          koottaymaNumericPrefix: { $first: '$koottaymaNumericPrefix' }, // Preserve for final sort
          families: {
            $push: {
              familyId: '$familyId', // Include family id
              familyNumber: '$familyNumber', // Include family number
              houseName: '$houseName',
              phone: '$phone',
              headName: { $ifNull: ['$headName', 'No Head Assigned'] },
              members: { $ifNull: ['$members', []] },
              totalAmount: { $ifNull: ['$totalFamilyAmount', 0] }
            }
          },
          totalAmount: { $sum: { $ifNull: ['$totalFamilyAmount', 0] } }
        }
      },
      // Final sort to ensure koottayma order is maintained
      {
        $sort: { 
          koottaymaNumericPrefix: 1,
          name: 1
        }
      },
      // Remove the temporary koottayma sorting fields
      {
        $project: {
          koottaymaNumericPrefix: 0
        }
      }
    ];

    const titheInfo = await koottaymas.aggregate(pipeline);

    if (!titheInfo || titheInfo.length === 0) {
      return res.status(200).json([]);
    }

    res.status(200).json(titheInfo);

  } catch (error) {
    console.error('Error in getKoottaymaWiseTitheInfo:', error);
    res.status(500).json({ message: error.message });
  }
};
// const getConsolidatedTitheByKoottayma = async (req, res) => {
//   try {
//     const { parishId } = req.params;
//     const currentYear = new Date().getFullYear();
//     const startDate = new Date(`${currentYear}-04-01`);
//     const endDate = new Date(`${currentYear + 1}-03-31`);

//     // First get all koottaymas for the parish
//     const consolidatedTithe = await koottaymas.aggregate([
//       // Start with all koottaymas for this parish
//       {
//         $match: {
//           parish: new mongoose.Types.ObjectId(parishId)
//         }
//       },
//       // Lookup families for each koottayma
//       {
//         $lookup: {
//           from: 'families',
//           localField: '_id',
//           foreignField: 'koottayma',
//           as: 'families'
//         }
//       },
//       // Unwind families array to lookup transactions
//       {
//         $unwind: {
//           path: '$families',
//           preserveNullAndEmptyArrays: true
//         }
//       },
//       // Convert family id to string for transaction lookup
//       {
//         $addFields: {
//           'families.idStr': { $toString: '$families.id' }
//         }
//       },
//       // Lookup transactions for each family within the date range (excluding transfers)
//       {
//         $lookup: {
//           from: 'transactions',
//           let: { 
//             familyId: '$families.idStr',
//             startDate: startDate,
//             endDate: endDate
//           },
//           pipeline: [
//             {
//               $match: {
//                 $expr: {
//                   $and: [
//                     { $eq: ['$family', '$$familyId'] },
//                     { $gte: ['$date', '$$startDate'] },
//                     { $lte: ['$date', '$$endDate'] },
//                     // Exclude transferred amounts
//                     { $or: [
//                         { $eq: ['$isTransferred', false] },
//                         { $eq: ['$isTransferred', null] },
//                         { $not: { $ifNull: ['$isTransferred', false] } }
//                       ]
//                     }
//                   ]
//                 }
//               }
//             }
//           ],
//           as: 'transactions'
//         }
//       },
//       // Calculate total amount for each family
//       {
//         $addFields: {
//           familyTotal: {
//             $sum: '$transactions.amountPaid'
//           }
//         }
//       },
//       // Sort families by name within each koottayma before grouping
//       {
//         $sort: { 
//           name: 1,              // First by koottayma name
//           'families.name': 1    // Then by family name
//         }
//       },
//       // Group back to koottayma level and sum all family totals
//       {
//         $group: {
//           _id: '$_id',
//           name: { $first: '$name' },
//           amount: {
//             $sum: '$familyTotal'
//           }
//         }
//       },
//       // Add field to extract numeric prefix for proper sorting with error handling
//       {
//         $addFields: {
//           // Extract the first part before dot, then the first word
//           firstPart: {
//             $arrayElemAt: [
//               { $split: ["$name", "."] },
//               0
//             ]
//           }
//         }
//       },
//       {
//         $addFields: {
//           // Extract the first word from the first part
//           firstWord: {
//             $arrayElemAt: [
//               { $split: ["$firstPart", " "] },
//               0
//             ]
//           }
//         }
//       },
//       {
//         $addFields: {
//           // Try to convert to number, use 0 if conversion fails
//           numericPrefix: {
//             $convert: {
//               input: "$firstWord",
//               to: "int",
//               onError: 0,  // Use 0 if conversion fails
//               onNull: 0    // Use 0 if input is null
//             }
//           },
//           // Create a flag to identify if the first word is numeric
//           isNumeric: {
//             $regexMatch: {
//               input: "$firstWord",
//               regex: "^[0-9]+$"  // Only digits
//             }
//           }
//         }
//       },
//       // Sort by numeric prefix first for numeric entries, then by name
//       {
//         $sort: { 
//           isNumeric: -1,      // Numeric entries first
//           numericPrefix: 1,   // Then by numeric value for numeric entries
//           name: 1             // Then alphabetically for non-numeric entries
//         }
//       },
//       // Remove the temporary fields
//       {
//         $project: {
//           firstPart: 0,
//           firstWord: 0,
//           numericPrefix: 0,
//           isNumeric: 0
//         }
//       }
//     ]);

//     res.status(200).json(consolidatedTithe);
//   } catch (error) {
//     console.error('Error in getConsolidatedTitheByKoottayma:', error);
//     res.status(500).json({ message: error.message });
//   }
// };
const getConsolidatedTitheByKoottayma = async (req, res) => {
  try {
    const { parishId } = req.params;
    const currentYear = new Date().getFullYear();
    const startDate = new Date(`${currentYear}-04-01`);
    const endDate = new Date(`${currentYear + 1}-03-31`);

    // First get all koottaymas for the parish
    const consolidatedTithe = await koottaymas.aggregate([
      // Start with all koottaymas for this parish
      {
        $match: {
          parish: new mongoose.Types.ObjectId(parishId)
        }
      },
      // Lookup families for each koottayma
      {
        $lookup: {
          from: 'families',
          localField: '_id',
          foreignField: 'koottayma',
          as: 'families'
        }
      },
      // Unwind families array to lookup transactions
      {
        $unwind: {
          path: '$families',
          preserveNullAndEmptyArrays: true
        }
      },
      // Convert family id to string for transaction lookup
      {
        $addFields: {
          'families.idStr': { $toString: '$families.id' }
        }
      },
      // Lookup transactions for each family within the date range (excluding transfers)
      {
        $lookup: {
          from: 'transactions',
          let: { 
            familyId: '$families.idStr',
            startDate: startDate,
            endDate: endDate
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$family', '$$familyId'] },
                    { $gte: ['$date', '$$startDate'] },
                    { $lte: ['$date', '$$endDate'] },
                    // Exclude transferred amounts
                    { $or: [
                        { $eq: ['$isTransferred', false] },
                        { $eq: ['$isTransferred', null] },
                        { $not: { $ifNull: ['$isTransferred', false] } }
                      ]
                    }
                  ]
                }
              }
            }
          ],
          as: 'transactions'
        }
      },
      // Calculate total amount for each family and determine if family participated
      {
        $addFields: {
          familyTotal: {
            $sum: '$transactions.amountPaid'
          },
          familyParticipated: {
            $cond: [
              { $gt: [{ $size: '$transactions' }, 0] }, // If family has transactions
              1, // Count as 1 participating family
              0  // Otherwise 0
            ]
          }
        }
      },
      // Sort families by name within each koottayma before grouping
      {
        $sort: { 
          name: 1,              // First by koottayma name
          'families.name': 1    // Then by family name
        }
      },
      // Group back to koottayma level and sum all family totals
      {
        $group: {
          _id: '$_id',
          name: { $first: '$name' },
          amount: {
            $sum: '$familyTotal'
          },
          totalFamiliesParticipated: {
            $sum: '$familyParticipated'
          },
          totalFamilies: {
            $sum: 1 // Count all families in koottayma
          }
        }
      },
      // Add field to extract numeric prefix for proper sorting with error handling
      {
        $addFields: {
          // Extract the first part before dot, then the first word
          firstPart: {
            $arrayElemAt: [
              { $split: ["$name", "."] },
              0
            ]
          }
        }
      },
      {
        $addFields: {
          // Extract the first word from the first part
          firstWord: {
            $arrayElemAt: [
              { $split: ["$firstPart", " "] },
              0
            ]
          }
        }
      },
      {
        $addFields: {
          // Try to convert to number, use 0 if conversion fails
          numericPrefix: {
            $convert: {
              input: "$firstWord",
              to: "int",
              onError: 0,  // Use 0 if conversion fails
              onNull: 0    // Use 0 if input is null
            }
          },
          // Create a flag to identify if the first word is numeric
          isNumeric: {
            $regexMatch: {
              input: "$firstWord",
              regex: "^[0-9]+$"  // Only digits
            }
          }
        }
      },
      // Sort by numeric prefix first for numeric entries, then by name
      {
        $sort: { 
          isNumeric: -1,      // Numeric entries first
          numericPrefix: 1,   // Then by numeric value for numeric entries
          name: 1             // Then alphabetically for non-numeric entries
        }
      },
      // Remove the temporary fields
      {
        $project: {
          firstPart: 0,
          firstWord: 0,
          numericPrefix: 0,
          isNumeric: 0
        }
      }
    ]);

    res.status(200).json(consolidatedTithe);
  } catch (error) {
    console.error('Error in getConsolidatedTitheByKoottayma:', error);
    res.status(500).json({ message: error.message });
  }
};
async function getCurrentUserAuditLogs(req, res) {
  try {
    const { page, limit, action, startDate, endDate } = req.params;
    const userId = req.user.id; // Get from authenticated user
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const filter = { userId };
    
    // Add action filter if provided
    if (action && action !== 'all') {
      filter.action = action;
    }
    
    // Add date range filter if provided
    const startDateParsed = parseDate(startDate);
    const endDateParsed = parseDate(endDate);
    
    if (startDateParsed || endDateParsed) {
      filter.createdAt = {};
      if (startDateParsed) filter.createdAt.$gte = startDateParsed;
      if (endDateParsed) filter.createdAt.$lte = endDateParsed;
    }
    
    const auditLogs = await TransactionAudit.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('transactionId')
      .populate('personId', 'name')
      .populate('parishId', 'name');
    
    const total = await TransactionAudit.countDocuments(filter);
    
    res.json({
      auditLogs,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalRecords: total,
        hasNext: parseInt(page) * parseInt(limit) < total,
        hasPrev: parseInt(page) > 1
      }
    });
  } catch (error) {
    console.error('Error fetching current user audit logs:', error);
    res.status(500).json({ message: 'Error fetching audit logs' });
  }
}

// Get audit logs for a specific transaction with path parameters
async function getTransactionAuditLogsByTransaction(req, res) {
  try {
    const { transactionId, page, limit } = req.params;
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const auditLogs = await TransactionAudit.find({ transactionId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('userId', 'name email')
      .populate('personId', 'name')
      .populate('parishId', 'name');
    
    const total = await TransactionAudit.countDocuments({ transactionId });
    
    res.json({
      auditLogs,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalRecords: total,
        hasNext: parseInt(page) * parseInt(limit) < total,
        hasPrev: parseInt(page) > 1
      }
    });
  } catch (error) {
    console.error('Error fetching transaction audit logs:', error);
    res.status(500).json({ message: 'Error fetching audit logs' });
  }
}

// Get audit summary with path parameters
async function getAuditSummaryWithPath(req, res) {
  try {
    const { startDate, endDate, userId } = req.params;
    
    const matchStage = {};
    
    // Parse dates
    const startDateParsed = parseDate(startDate);
    const endDateParsed = parseDate(endDate);
    
    if (startDateParsed || endDateParsed) {
      matchStage.createdAt = {};
      if (startDateParsed) matchStage.createdAt.$gte = startDateParsed;
      if (endDateParsed) matchStage.createdAt.$lte = endDateParsed;
    }
    
    if (userId !== 'null') {
      matchStage.userId = new mongoose.Types.ObjectId(userId);
    }
    
    const summary = await TransactionAudit.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: {
            action: '$action',
            userId: '$userId',
            userName: '$userName'
          },
          count: { $sum: 1 },
          totalAmount: { $sum: { $ifNull: ['$amount', 0] } }
        }
      },
      {
        $group: {
          _id: '$_id.userId',
          userName: { $first: '$_id.userName' },
          actions: {
            $push: {
              action: '$_id.action',
              count: '$count',
              totalAmount: '$totalAmount'
            }
          },
          totalOperations: { $sum: '$count' }
        }
      },
      { $sort: { totalOperations: -1 } }
    ]);
    
    res.json({
      summary,
      period: { 
        startDate: startDate !== 'null' ? startDate : null, 
        endDate: endDate !== 'null' ? endDate : null 
      }
    });
  } catch (error) {
    console.error('Error fetching audit summary:', error);
    res.status(500).json({ message: 'Error fetching audit summary' });
  }
}

// Get audit logs for specific user with path parameters (admin only)
async function getUserAuditLogsWithPath(req, res) {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
    }

    const { userId, page, limit, action, startDate, endDate } = req.params;
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const filter = { userId };
    
    // Add action filter if provided
    if (action && action !== 'all') {
      filter.action = action;
    }
    
    // Add date range filter if provided
    const startDateParsed = parseDate(startDate);
    const endDateParsed = parseDate(endDate);
    
    if (startDateParsed || endDateParsed) {
      filter.createdAt = {};
      if (startDateParsed) filter.createdAt.$gte = startDateParsed;
      if (endDateParsed) filter.createdAt.$lte = endDateParsed;
    }
    
    const auditLogs = await TransactionAudit.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('transactionId')
      .populate('personId', 'name')
      .populate('parishId', 'name');
    
    const total = await TransactionAudit.countDocuments(filter);
    
    res.json({
      auditLogs,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalRecords: total,
        hasNext: parseInt(page) * parseInt(limit) < total,
        hasPrev: parseInt(page) > 1
      }
    });
  } catch (error) {
    console.error('Error fetching user audit logs:', error);
    res.status(500).json({ message: 'Error fetching audit logs' });
  }
}

// Get all audit logs with path parameters (admin only)
async function getAllAuditLogsWithPath(req, res) {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
    }

    const { page, limit, action, userId, startDate, endDate } = req.params;
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const filter = {};
    
    // Add filters
    if (action && action !== 'all') {
      filter.action = action;
    }
    
    if (userId !== 'null') {
      filter.userId = new mongoose.Types.ObjectId(userId);
    }
    
    // Add date range filter if provided
    const startDateParsed = parseDate(startDate);
    const endDateParsed = parseDate(endDate);
    
    if (startDateParsed || endDateParsed) {
      filter.createdAt = {};
      if (startDateParsed) filter.createdAt.$gte = startDateParsed;
      if (endDateParsed) filter.createdAt.$lte = endDateParsed;
    }
    
    const auditLogs = await TransactionAudit.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('userId', 'name email')
      .populate('transactionId')
      .populate('personId', 'name')
      .populate('parishId', 'name');
    
    const total = await TransactionAudit.countDocuments(filter);
    
    res.json({
      auditLogs,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalRecords: total,
        hasNext: parseInt(page) * parseInt(limit) < total,
        hasPrev: parseInt(page) > 1
      }
    });
  } catch (error) {
    console.error('Error fetching all audit logs:', error);
    res.status(500).json({ message: 'Error fetching audit logs' });
  }
}
async function getFamilyMismatchRecords(req, res) {
  try {
    const { page = 1, limit = 50 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Main aggregation pipeline to find family mismatches
    const pipeline = [
      // Join people with their transactions
      {
        $lookup: {
          from: "transactions",
          localField: "_id",
          foreignField: "person",
          as: "txn"
        }
      },
      // Unwind to get individual transaction records
      { 
        $unwind: "$txn" 
      },
      // Filter for records where person's family doesn't match transaction's family
      {
        $match: {
          $expr: {
            $ne: ["$family", "$txn.family"]
          }
        }
      },
      // Convert family string to integer for lookup
      {
        $addFields: {
          familyInt: { $toInt: "$family" }
        }
      },
      // Lookup family information
      {
        $lookup: {
          from: "families",
          localField: "familyInt",
          foreignField: "id",
          as: "familyInfo"
        }
      },
      { 
        $unwind: "$familyInfo" 
      },
      // Lookup parish information
      {
        $lookup: {
          from: "parishes",
          localField: "parish",
          foreignField: "_id",
          as: "parishInfo"
        }
      },
      { 
        $unwind: "$parishInfo" 
      },
      // Project only needed fields
      {
        $project: {
          _id: 0,
          personId: "$_id",
          name: 1,
          baptismName: 1,
          personFamily: "$family",
          transactionFamily: "$txn.family",
          parishName: "$parishInfo.name",
          familyNumber: "$familyInfo.familyNumber",
          familyName: "$familyInfo.name",
          transactionDate: "$txn.date",
          transactionId: "$txn._id",
          transactionAmount: "$txn.amountPaid",
          transactionStatus: "$txn.status"
        }
      },
      // Sort by parish name, then by family number
      {
        $sort: {
          parishName: 1,
          familyNumber: 1,
          name: 1
        }
      },
      // Add pagination
      { $skip: skip },
      { $limit: parseInt(limit) }
    ];

    // Execute the aggregation
    const mismatchRecords = await Person.aggregate(pipeline);

    // Get total count for pagination (without skip/limit)
    const countPipeline = pipeline.slice(0, -2); // Remove skip and limit stages
    const totalCountResult = await Person.aggregate([
      ...countPipeline,
      { $count: "total" }
    ]);
    
    const totalRecords = totalCountResult.length > 0 ? totalCountResult[0].total : 0;
    const totalPages = Math.ceil(totalRecords / parseInt(limit));

    // Response with pagination info
    res.status(200).json({
      success: true,
      data: mismatchRecords,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalRecords,
        hasNext: parseInt(page) < totalPages,
        hasPrev: parseInt(page) > 1,
        limit: parseInt(limit)
      },
      message: `Found ${mismatchRecords.length} family mismatch records`
    });

  } catch (error) {
    console.error('Error fetching family mismatch records:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching family mismatch records',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

// Alternative function to get summary statistics of mismatches
async function getFamilyMismatchSummary(req, res) {
  try {
    const summaryPipeline = [
      {
        $lookup: {
          from: "transactions",
          localField: "_id",
          foreignField: "person",
          as: "txn"
        }
      },
      { $unwind: "$txn" },
      {
        $match: {
          $expr: {
            $ne: ["$family", "$txn.family"]
          }
        }
      },
      {
        $lookup: {
          from: "parishes",
          localField: "parish",
          foreignField: "_id",
          as: "parishInfo"
        }
      },
      { $unwind: "$parishInfo" },
      {
        $group: {
          _id: {
            parishId: "$parish",
            parishName: "$parishInfo.name"
          },
          mismatchCount: { $sum: 1 },
          totalAmount: { $sum: "$txn.amountPaid" },
          uniquePeople: { $addToSet: "$_id" },
          uniqueTransactions: { $addToSet: "$txn._id" }
        }
      },
      {
        $project: {
          _id: 0,
          parishId: "$_id.parishId",
          parishName: "$_id.parishName",
          mismatchCount: 1,
          totalAmount: 1,
          uniquePeopleCount: { $size: "$uniquePeople" },
          uniqueTransactionsCount: { $size: "$uniqueTransactions" }
        }
      },
      {
        $sort: { mismatchCount: -1 }
      }
    ];

    const summary = await Person.aggregate(summaryPipeline);

    // Get overall totals
    const overallTotal = summary.reduce((acc, curr) => ({
      totalMismatches: acc.totalMismatches + curr.mismatchCount,
      totalAmount: acc.totalAmount + curr.totalAmount,
      totalPeople: acc.totalPeople + curr.uniquePeopleCount,
      totalTransactions: acc.totalTransactions + curr.uniqueTransactionsCount
    }), { totalMismatches: 0, totalAmount: 0, totalPeople: 0, totalTransactions: 0 });

    res.status(200).json({
      success: true,
      summary: {
        byParish: summary,
        overall: overallTotal
      },
      message: 'Family mismatch summary retrieved successfully'
    });

  } catch (error) {
    console.error('Error fetching family mismatch summary:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching family mismatch summary',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

// Function to fix family mismatches (updates person's family to match transaction)
async function fixFamilyMismatches(req, res) {
  try {
    const userInfo = getUserInfo(req);
    const { transactionIds } = req.body; // Array of transaction IDs to fix

    if (!transactionIds || !Array.isArray(transactionIds)) {
      return res.status(400).json({
        success: false,
        message: 'transactionIds array is required'
      });
    }

    const results = [];
    
    for (const transactionId of transactionIds) {
      try {
        // Find the transaction and person
        const transaction = await Transaction.findById(transactionId).populate('person');
        
        if (!transaction) {
          results.push({
            transactionId,
            success: false,
            message: 'Transaction not found'
          });
          continue;
        }

        const person = transaction.person;
        if (!person) {
          results.push({
            transactionId,
            success: false,
            message: 'Person not found'
          });
          continue;
        }

        // Check if there's actually a mismatch
        if (person.family === transaction.family) {
          results.push({
            transactionId,
            success: false,
            message: 'No family mismatch found'
          });
          continue;
        }

        const oldFamily = person.family;
        const newFamily = transaction.family;

        // Update person's family to match transaction's family
        await Person.findByIdAndUpdate(person._id, {
          family: newFamily
        });

        // Log the fix operation
        await AuditLogger.logUpdate(
          person._id,
          userInfo,
          { family: oldFamily },
          { family: newFamily },
          req,
          'Family mismatch fix'
        );

        results.push({
          transactionId,
          personId: person._id,
          personName: person.name,
          success: true,
          message: `Updated person family from ${oldFamily} to ${newFamily}`
        });

      } catch (error) {
        results.push({
          transactionId,
          success: false,
          message: error.message
        });
      }
    }

    res.status(200).json({
      success: true,
      results,
      message: `Processed ${transactionIds.length} family mismatch fixes`
    });

  } catch (error) {
    console.error('Error fixing family mismatches:', error);
    res.status(500).json({
      success: false,
      message: 'Error fixing family mismatches',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}
module.exports = {
  createNewTransaction,
  calculateForaneTotal,
  calculateParishTotal,
  calculateFamilyTotal,
  calculatePersonTotal,
  getTransferredTransaction,
  getTransactionAuditLogs,
  getUserAuditLogs,
  getAuditSummary,
  getCurrentUserAuditLogs,
  getTransactionAuditLogsByTransaction,
  getAuditSummaryWithPath,
  getUserAuditLogsWithPath,

  updateTransaction,
  deleteTransaction,
  getLatestTransaction,
  getTransactionsByYear,
  calculateYearlyDatasum,
  calculateYearlyData,
  calculateYearlyDataByForane,
  calculateYearlyDataTotal,
  getPersonByYear,
  getAllPersonTransactions,
  transferTransaction,
  calculateTranParishTotal,
  getKoottaymaWiseTitheInfo,
  getConsolidatedTitheByKoottayma,
   getFamilyMismatchRecords,
  getFamilyMismatchSummary,
  fixFamilyMismatches,
};
