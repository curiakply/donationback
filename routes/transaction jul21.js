const express = require("express");
const router = express.Router();
const { verifyToken } = require('../middleware/auth.middleware');
const mongoose = require('mongoose');
const TransactionAudit = require('../models/TransactionAudit');
const Transaction = require('../models/Transaction');
const {
  createNewTransaction,
  calculateFamilyTotal,
  calculateForaneTotal,
  calculateParishTotal,
  calculatePersonTotal,
  getTransferredTransaction,
  updateTransaction,
  deleteTransaction,
  getLatestTransaction,
  getTransactionsByYear,
  calculateYearlyData,
  calculateYearlyDatasum,
  calculateYearlyDataByForane,
  calculateYearlyDataTotal,
  getPersonByYear,
  getAllPersonTransactions,
  transferTransaction,
  calculateTranParishTotal,
  getKoottaymaWiseTitheInfo,
  getConsolidatedTitheByKoottayma,
  // Audit endpoints
  getTransactionAuditLogs,
  getUserAuditLogs,
  getAuditSummary
} = require("../controllers/transactionController");

/**
 * @swagger
 * components:
 *   schemas:
 *     Transaction:
 *       type: object
 *       properties:
 *         forane:
 *           type: string
 *           description: The ID of the forane associated with the transaction.
 *         parish:
 *           type: string
 *           description: The ID of the parish associated with the transaction.
 *         family:
 *           type: string
 *           description: The ID of the family associated with the transaction.
 *         person:
 *           type: string
 *           description: The ID of the person associated with the transaction.
 *         amountPaid:
 *           type: number
 *           description: The amount paid in the transaction.
 *         date:
 *           type: string
 *           format: date("dd/MM/yyyy")
 *           description: The date of the transaction.
 *       required:
 *         - forane
 *         - parish
 *         - family
 *         - person
 *         - amountPaid
 *
 *     TransactionAudit:
 *       type: object
 *       properties:
 *         transactionId:
 *           type: string
 *           description: ID of the transaction
 *         userId:
 *           type: string
 *           description: ID of the user who performed the action
 *         userName:
 *           type: string
 *           description: Name of the user
 *         userEmail:
 *           type: string
 *           description: Email of the user
 *         action:
 *           type: string
 *           enum: [CREATE, UPDATE, DELETE, TRANSFER, ROLLBACK, RESTORE]
 *           description: Type of action performed
 *         amount:
 *           type: number
 *           description: Transaction amount
 *         description:
 *           type: string
 *           description: Description of the action
 *         ipAddress:
 *           type: string
 *           description: IP address of the user
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: When the action was performed
 */

// ========================================
// EXISTING TRANSACTION ROUTES (with auth)
// ========================================

router.get("/forane/:foraneid", verifyToken, calculateForaneTotal);
router.get("/parish/:parishid", verifyToken, calculateParishTotal);
router.get("/family/:familyid", verifyToken, calculateFamilyTotal);
router.get("/person/:personid", verifyToken, calculatePersonTotal);
router.get("/latest/person/:personid", verifyToken, getLatestTransaction);
router.get('/person/:personId/year/:year/transferred', verifyToken, getTransferredTransaction);

// Transaction CRUD operations (all require authentication)
router.post("/", verifyToken, createNewTransaction);
router.put("/transactionId/:transactionId", verifyToken, updateTransaction);
router.delete('/:id', verifyToken, deleteTransaction);
router.post('/transfer', verifyToken, transferTransaction);

// Data retrieval routes
router.get("/year/:familyId", verifyToken, getTransactionsByYear);  
router.get("/person/:personid/year/:year", verifyToken, getPersonByYear);
router.get("/yearlyData/:year", verifyToken, calculateYearlyData);
router.get("/yearlysumData/:year", verifyToken, calculateYearlyDatasum);
router.get("/yearly/:year/forane/:foraneId", verifyToken, calculateYearlyDataByForane);
router.get("/yearlytotal/", verifyToken, calculateYearlyDataTotal);
router.get('/person/:personId/all', verifyToken, getAllPersonTransactions);
router.get('/parish/all-with-transactions/year/:year', verifyToken, calculateTranParishTotal);
router.get('/tithe-info/:parishId', verifyToken, getKoottaymaWiseTitheInfo);
router.get('/consolidated-tithe/:parishId', verifyToken, getConsolidatedTitheByKoottayma);

// ========================================
// AUDIT ROUTES WITH PATH PARAMETERS
// ========================================

// Helper function to parse date parameter
const parseDate = (dateParam) => {
  return dateParam === 'null' ? null : new Date(dateParam);
};

/**
 * @swagger
 * /transactionRoutes/audit/user/current/{page}/{limit}/{action}/{startDate}/{endDate}:
 *   get:
 *     summary: Get audit logs for current authenticated user
 *     tags:
 *       - Transaction Audit
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: page
 *         required: true
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: path
 *         name: limit
 *         required: true
 *         schema:
 *           type: integer
 *           default: 50
 *       - in: path
 *         name: action
 *         required: true
 *         schema:
 *           type: string
 *           enum: [CREATE, UPDATE, DELETE, TRANSFER, ROLLBACK, RESTORE, all]
 *       - in: path
 *         name: startDate
 *         required: true
 *         schema:
 *           type: string
 *           description: Start date (YYYY-MM-DD) or 'null'
 *       - in: path
 *         name: endDate
 *         required: true
 *         schema:
 *           type: string
 *           description: End date (YYYY-MM-DD) or 'null'
 *     responses:
 *       200:
 *         description: Current user audit logs retrieved successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */

// Get current user's audit logs
router.get("/audit/user/current/:page/:limit/:action/:startDate/:endDate", verifyToken, async (req, res) => {
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
});
// GET /transaction/transferred-from/:personId
router.get('/transferred-from/:personId', async (req, res) => {
  try {
    const { personId } = req.params;
    
    const transferredTransactions = await Transaction.find({
      originalPerson: personId,
      isTransferred: true,
      status: 'transferred'
    });
    
    res.json(transferredTransactions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
/**
 * @swagger
 * /transactionRoutes/audit/transaction/{transactionId}/{page}/{limit}:
 *   get:
 *     summary: Get audit logs for a specific transaction
 *     tags:
 *       - Transaction Audit
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: transactionId
 *         required: true
 *         schema:
 *           type: string
 *         description: Transaction ID
 *       - in: path
 *         name: page
 *         required: true
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: path
 *         name: limit
 *         required: true
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: Transaction audit logs retrieved successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */

// Get audit logs for specific transaction
router.get("/audit/transaction/:transactionId/:page/:limit", verifyToken, async (req, res) => {
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
});

/**
 * @swagger
 * /transactionRoutes/audit/summary/{startDate}/{endDate}/{userId}:
 *   get:
 *     summary: Get audit summary statistics
 *     tags:
 *       - Transaction Audit
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: startDate
 *         required: true
 *         schema:
 *           type: string
 *           description: Start date (YYYY-MM-DD) or 'null'
 *       - in: path
 *         name: endDate
 *         required: true
 *         schema:
 *           type: string
 *           description: End date (YYYY-MM-DD) or 'null'
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           description: User ID or 'null'
 *     responses:
 *       200:
 *         description: Audit summary retrieved successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */

// Get audit summary
router.get("/audit/summary/:startDate/:endDate/:userId", verifyToken, async (req, res) => {
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
});

/**
 * @swagger
 * /transactionRoutes/audit/user/{userId}/{page}/{limit}/{action}/{startDate}/{endDate}:
 *   get:
 *     summary: Get audit logs for a specific user (admin only)
 *     tags:
 *       - Transaction Audit
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *       - in: path
 *         name: page
 *         required: true
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: path
 *         name: limit
 *         required: true
 *         schema:
 *           type: integer
 *           default: 50
 *       - in: path
 *         name: action
 *         required: true
 *         schema:
 *           type: string
 *           enum: [CREATE, UPDATE, DELETE, TRANSFER, ROLLBACK, RESTORE, all]
 *       - in: path
 *         name: startDate
 *         required: true
 *         schema:
 *           type: string
 *           description: Start date (YYYY-MM-DD) or 'null'
 *       - in: path
 *         name: endDate
 *         required: true
 *         schema:
 *           type: string
 *           description: End date (YYYY-MM-DD) or 'null'
 *     responses:
 *       200:
 *         description: User audit logs retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied - Admin only
 *       500:
 *         description: Server error
 */

// Get audit logs for specific user (admin only)
router.get("/audit/user/:userId/:page/:limit/:action/:startDate/:endDate", verifyToken, async (req, res) => {
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
});

/**
 * @swagger
 * /transactionRoutes/audit/all/{page}/{limit}/{action}/{userId}/{startDate}/{endDate}:
 *   get:
 *     summary: Get all audit logs (admin only)
 *     tags:
 *       - Transaction Audit
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: page
 *         required: true
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: path
 *         name: limit
 *         required: true
 *         schema:
 *           type: integer
 *           default: 50
 *       - in: path
 *         name: action
 *         required: true
 *         schema:
 *           type: string
 *           enum: [CREATE, UPDATE, DELETE, TRANSFER, ROLLBACK, RESTORE, all]
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           description: User ID or 'null'
 *       - in: path
 *         name: startDate
 *         required: true
 *         schema:
 *           type: string
 *           description: Start date (YYYY-MM-DD) or 'null'
 *       - in: path
 *         name: endDate
 *         required: true
 *         schema:
 *           type: string
 *           description: End date (YYYY-MM-DD) or 'null'
 *     responses:
 *       200:
 *         description: All audit logs retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied - Admin only
 *       500:
 *         description: Server error
 */

// Get all audit logs (admin only)
router.get("/audit/all/:page/:limit/:action/:userId/:startDate/:endDate", verifyToken, async (req, res) => {
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
});

// ========================================
// LEGACY AUDIT ROUTES (for backward compatibility)
// ========================================

// Original audit routes (keep for backward compatibility with query parameters)
router.get("/audit/:transactionId", verifyToken, getTransactionAuditLogs);
router.get("/audit/user/:userId", verifyToken, getUserAuditLogs);
router.get("/audit/summary", verifyToken, getAuditSummary);

// Legacy admin route for all audit logs
router.get("/audit/all", verifyToken, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
    }

    const { 
      page = 1, 
      limit = 50, 
      action, 
      userId, 
      startDate, 
      endDate 
    } = req.query;
    
    const skip = (page - 1) * limit;
    const filter = {};
    
    // Add filters
    if (action && action !== 'all') {
      filter.action = action;
    }
    
    if (userId) {
      filter.userId = new mongoose.Types.ObjectId(userId);
    }
    
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
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
        totalPages: Math.ceil(total / limit),
        totalRecords: total,
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Error fetching all audit logs:', error);
    res.status(500).json({ message: 'Error fetching audit logs' });
  }
});

module.exports = router;