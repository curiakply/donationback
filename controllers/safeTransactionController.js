// Enhanced transaction controller methods with concurrency control

const Transaction = require("../models/Transaction");
const AuditLogger = require('../middleware/auditLogger');

const getUserInfo = (req) => {
  return {
    id: req.user?.id || 'unknown',
    name: req.user?.name || 'Unknown User',
    email: req.user?.email || 'unknown@email.com'
  };
};

const getSystemId = () => {
  return process.env.SYSTEM_ID || require('os').hostname();
};

// ==========================================
// SAFE TRANSACTION CREATION
// ==========================================

async function createNewTransactionSafely(req, res) {
  const systemId = getSystemId();
  const userInfo = getUserInfo(req);
  let retryCount = 0;
  const maxRetries = 3;
  
  while (retryCount < maxRetries) {
    try {
      // Use the safe creation method
      const newTransaction = await Transaction.createSafely(req.body, systemId);
      
      // Log the creation
      await AuditLogger.logCreate(newTransaction._id, userInfo, req, {
        originalRequest: req.body,
        systemId,
        retryCount
      });
      
      return res.status(201).json({ 
        message: "Transaction successfully recorded.",
        transactionId: newTransaction._id,
        systemId,
        created: !newTransaction.createdAt || newTransaction.createdAt === newTransaction.updatedAt
      });
      
    } catch (error) {
      retryCount++;
      
      if (error.message.includes('already exists') && retryCount < maxRetries) {
        // Exponential backoff for retries
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 100));
        continue;
      }
      
      console.error(`[${systemId}] Create transaction error (attempt ${retryCount}):`, error);
      
      // Log the failed attempt
      try {
        await AuditLogger.logTransactionAction({
          transactionId: null,
          userId: userInfo.id,
          userName: userInfo.name,
          userEmail: userInfo.email,
          action: 'CREATE_FAILED',
          description: `Transaction creation failed: ${error.message}`,
          req,
          metadata: {
            error: error.message,
            retryCount,
            systemId
          }
        });
      } catch (auditError) {
        console.error('Failed to log audit error:', auditError);
      }
      
      return res.status(500).json({ 
        message: error.message,
        systemId,
        retryCount 
      });
    }
  }
}

// ==========================================
// SAFE TRANSACTION UPDATE
// ==========================================

async function updateTransactionSafely(req, res) {
  const systemId = getSystemId();
  const userInfo = getUserInfo(req);
  const transactionId = req.params.transactionId;
  
  try {
    // Get the current transaction
    const currentTransaction = await Transaction.findById(transactionId);
    if (!currentTransaction) {
      return res.status(404).json({ message: "Transaction not found." });
    }
    
    // Store old data for audit
    const oldData = currentTransaction.toObject();
    
    // Use optimistic locking update
    const updatedTransaction = await currentTransaction.updateWithRetry(
      req.body,
      systemId,
      3 // max retries
    );
    
    // Log the update
    await AuditLogger.logUpdate(
      transactionId, 
      userInfo, 
      oldData, 
      updatedTransaction.toObject(), 
      req,
      {
        systemId: systemId
      }
    );
    
    res.status(200).json({
      message: "Transaction updated successfully",
      transaction: updatedTransaction,
      systemId
    });
    
  } catch (error) {
    console.error(`[${systemId}] Update transaction error:`, error);
    
    if (error.message.includes('version mismatch') || error.message.includes('retries')) {
      return res.status(409).json({ 
        message: "Transaction was modified by another system. Please refresh and try again.",
        error: error.message,
        systemId 
      });
    }
    
    res.status(500).json({ 
      message: "Error updating transaction.",
      error: error.message,
      systemId 
    });
  }
}

// ==========================================
// SAFE TRANSACTION TRANSFER
// ==========================================

async function transferTransactionSafely(req, res) {
  const systemId = getSystemId();
  const userInfo = getUserInfo(req);
  
  try {
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

    // Use the safe transfer method
    const result = await Transaction.transferSafely(
      fromPerson,
      toPerson,
      {
        reason,
        status,
        forane,
        parish,
        family,
        amount,
        date
      },
      systemId
    );
    
    // Log the transfer
    await AuditLogger.logTransfer(result.targetTransaction._id, userInfo, {
      fromPerson,
      toPerson,
      family,
      amount: result.targetTransaction.amountPaid,
      reason,
      status
    }, req);

    res.json({
      message: 'Transaction transferred successfully',
      sourceTransaction: result.sourceTransaction,
      targetTransaction: result.targetTransaction,
      systemId
    });

  } catch (error) {
    console.error(`[${systemId}] Transfer error:`, error);
    
    if (error.message.includes('locked')) {
      return res.status(423).json({ // 423 Locked
        message: 'Transaction is currently locked by another system',
        error: error.message,
        systemId
      });
    }
    
    res.status(500).json({
      message: error.message || 'Failed to transfer transaction',
      systemId
    });
  }
}

// ==========================================
// SAFE TRANSACTION DELETION
// ==========================================

async function deleteTransactionSafely(req, res) {
  const systemId = getSystemId();
  const userInfo = getUserInfo(req);
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ 
      message: 'Invalid transaction ID format',
      systemId 
    });
  }

  try {
    // Find and lock the transaction
    const transactionToDelete = await Transaction.findById(id);
    if (!transactionToDelete) {
      return res.status(404).json({ 
        message: 'Transaction not found',
        systemId 
      });
    }

    // Try to acquire lock for deletion
    await transactionToDelete.acquireLock(systemId, 'Deletion operation');

    // Store transaction data for audit
    const transactionData = transactionToDelete.toObject();

    // Delete the transaction
    const deletedTransaction = await Transaction.findByIdAndDelete(id);

    // Log the deletion
    await AuditLogger.logDelete(transactionData, userInfo, req);

    res.json({ 
      message: 'Transaction deleted successfully',
      deletedTransaction,
      systemId
    });

  } catch (error) {
    console.error(`[${systemId}] Error deleting transaction:`, error);
    
    if (error.message.includes('locked')) {
      return res.status(423).json({ // 423 Locked
        message: 'Transaction is currently locked by another system',
        error: error.message,
        systemId
      });
    }
    
    res.status(500).json({ 
      message: 'Error deleting transaction', 
      error: error.message,
      systemId
    });
  }
}

// ==========================================
// SYSTEM HEALTH AND CONFLICT MONITORING
// ==========================================

async function getSystemHealth(req, res) {
  const systemId = getSystemId();
  
  try {
    // Get conflict statistics
    const conflictStats = await Transaction.aggregate([
      {
        $match: {
          'concurrencyInfo.lastConflictAt': {
            $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
          }
        }
      },
      {
        $group: {
          _id: '$lastModifiedBySystem',
          conflictCount: { $sum: 1 },
          lastConflict: { $max: '$concurrencyInfo.lastConflictAt' }
        }
      }
    ]);
    
    // Get lock statistics
    const lockStats = await Transaction.aggregate([
      {
        $match: {
          'lockInfo.isLocked': true
        }
      },
      {
        $group: {
          _id: '$lockInfo.lockedBy',
          lockedCount: { $sum: 1 },
          oldestLock: { $min: '$lockInfo.lockedAt' }
        }
      }
    ]);
    
    // Get transaction counts by system
    const systemStats = await Transaction.aggregate([
      {
        $group: {
          _id: '$createdBySystem',
          totalTransactions: { $sum: 1 },
          activeTransactions: {
            $sum: {
              $cond: [{ $eq: ['$status', 'active'] }, 1, 0]
            }
          }
        }
      }
    ]);
    
    res.json({
      systemId,
      timestamp: new Date(),
      conflicts: conflictStats,
      locks: lockStats,
      systemStats: systemStats,
      health: {
        status: lockStats.length > 100 ? 'warning' : 'healthy',
        message: lockStats.length > 100 ? 'High number of locks detected' : 'System operating normally'
      }
    });
    
  } catch (error) {
    console.error(`[${systemId}] Error getting system health:`, error);
    res.status(500).json({
      message: 'Error retrieving system health',
      systemId,
      error: error.message
    });
  }
}

// ==========================================
// CLEANUP OPERATIONS
// ==========================================

async function cleanupExpiredLocks(req, res) {
  const systemId = getSystemId();
  
  try {
    const result = await Transaction.cleanupExpiredLocks();
    
    res.json({
      message: 'Lock cleanup completed',
      systemId,
      cleanedLocks: result.modifiedCount,
      timestamp: new Date()
    });
    
  } catch (error) {
    console.error(`[${systemId}] Error during lock cleanup:`, error);
    res.status(500).json({
      message: 'Error during lock cleanup',
      systemId,
      error: error.message
    });
  }
}

// ==========================================
// FORCE UNLOCK (ADMIN ONLY)
// ==========================================

async function forceUnlockTransaction(req, res) {
  const systemId = getSystemId();
  const userInfo = getUserInfo(req);
  const { transactionId } = req.params;
  
  // Check if user has admin privileges
  if (!req.user || !['admin', 'superadmin'].includes(req.user.role)) {
    return res.status(403).json({
      message: 'Admin privileges required for force unlock',
      systemId
    });
  }
  
  try {
    const result = await Transaction.findByIdAndUpdate(
      transactionId,
      {
        $set: {
          'lockInfo.isLocked': false,
          'lockInfo.lockedBy': null,
          'lockInfo.lockedAt': null,
          'lockInfo.lockExpiry': null,
          'lockInfo.lockReason': `Force unlocked by ${userInfo.name} from ${systemId}`,
          lastModifiedBySystem: systemId
        }
      },
      { new: true }
    );
    
    if (!result) {
      return res.status(404).json({
        message: 'Transaction not found',
        systemId
      });
    }
    
    // Log the force unlock
    await AuditLogger.logTransactionAction({
      transactionId,
      userId: userInfo.id,
      userName: userInfo.name,
      userEmail: userInfo.email,
      action: 'FORCE_UNLOCK',
      description: `Force unlocked transaction from ${systemId}`,
      req,
      metadata: {
        systemId,
        reason: 'Administrative force unlock'
      }
    });
    
    res.json({
      message: 'Transaction force unlocked successfully',
      transaction: result,
      systemId,
      unlockedBy: userInfo.name
    });
    
  } catch (error) {
    console.error(`[${systemId}] Error force unlocking transaction:`, error);
    res.status(500).json({
      message: 'Error force unlocking transaction',
      systemId,
      error: error.message
    });
  }
}

// ==========================================
// BATCH OPERATIONS WITH CONCURRENCY CONTROL
// ==========================================

async function batchUpdateTransactions(req, res) {
  const systemId = getSystemId();
  const userInfo = getUserInfo(req);
  const { transactions } = req.body; // Array of transaction updates
  
  if (!Array.isArray(transactions) || transactions.length === 0) {
    return res.status(400).json({
      message: 'Invalid transactions array',
      systemId
    });
  }
  
  const results = {
    successful: [],
    failed: [],
    conflicts: []
  };
  
  // Process transactions in smaller batches to reduce lock contention
  const batchSize = 5;
  
  for (let i = 0; i < transactions.length; i += batchSize) {
    const batch = transactions.slice(i, i + batchSize);
    
    await Promise.allSettled(
      batch.map(async (transactionUpdate) => {
        try {
          const { id, updateData } = transactionUpdate;
          
          const transaction = await Transaction.findById(id);
          if (!transaction) {
            results.failed.push({
              id,
              error: 'Transaction not found'
            });
            return;
          }
          
          const updatedTransaction = await transaction.updateWithRetry(
            updateData,
            systemId,
            2 // Reduced retries for batch operations
          );
          
          results.successful.push({
            id,
            transaction: updatedTransaction
          });
          
        } catch (error) {
          if (error.message.includes('version mismatch') || error.message.includes('retries')) {
            results.conflicts.push({
              id: transactionUpdate.id,
              error: error.message
            });
          } else {
            results.failed.push({
              id: transactionUpdate.id,
              error: error.message
            });
          }
        }
      })
    );
    
    // Small delay between batches to reduce system load
    if (i + batchSize < transactions.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  // Log batch operation
  await AuditLogger.logTransactionAction({
    transactionId: null,
    userId: userInfo.id,
    userName: userInfo.name,
    userEmail: userInfo.email,
    action: 'BATCH_UPDATE',
    description: `Batch updated ${results.successful.length} transactions, ${results.failed.length} failed, ${results.conflicts.length} conflicts`,
    req,
    metadata: {
      systemId,
      totalRequested: transactions.length,
      successful: results.successful.length,
      failed: results.failed.length,
      conflicts: results.conflicts.length
    }
  });
  
  res.json({
    message: 'Batch update completed',
    systemId,
    results,
    summary: {
      total: transactions.length,
      successful: results.successful.length,
      failed: results.failed.length,
      conflicts: results.conflicts.length
    }
  });
}

// ==========================================
// CONFLICT RESOLUTION
// ==========================================

async function resolveTransactionConflict(req, res) {
  const systemId = getSystemId();
  const userInfo = getUserInfo(req);
  const { transactionId, resolutionStrategy = 'latest_wins' } = req.body;
  
  try {
    const transaction = await Transaction.findById(transactionId);
    if (!transaction) {
      return res.status(404).json({
        message: 'Transaction not found',
        systemId
      });
    }
    
    let resolvedTransaction;
    
    switch (resolutionStrategy) {
      case 'latest_wins':
        // Simply update with current data, latest modification wins
        resolvedTransaction = await Transaction.findByIdAndUpdate(
          transactionId,
          {
            $set: {
              lastModifiedBySystem: systemId,
              'concurrencyInfo.lastConflictAt': null,
              'concurrencyInfo.conflictingSystems': []
            },
            $inc: { __v: 1 }
          },
          { new: true }
        );
        break;
        
      case 'merge':
        // Custom merge logic based on business rules
        const mergedData = await mergeConflictingData(transaction, req.body.mergeData);
        resolvedTransaction = await transaction.updateWithRetry(mergedData, systemId, 1);
        break;
        
      case 'manual':
        // Apply manually specified resolution
        if (!req.body.manualResolution) {
          return res.status(400).json({
            message: 'Manual resolution data required',
            systemId
          });
        }
        resolvedTransaction = await transaction.updateWithRetry(req.body.manualResolution, systemId, 1);
        break;
        
      default:
        return res.status(400).json({
          message: 'Invalid resolution strategy',
          systemId
        });
    }
    
    // Log conflict resolution
    await AuditLogger.logTransactionAction({
      transactionId,
      userId: userInfo.id,
      userName: userInfo.name,
      userEmail: userInfo.email,
      action: 'CONFLICT_RESOLVED',
      description: `Conflict resolved using ${resolutionStrategy} strategy`,
      req,
      metadata: {
        systemId,
        resolutionStrategy,
        resolvedAt: new Date()
      }
    });
    
    res.json({
      message: 'Conflict resolved successfully',
      transaction: resolvedTransaction,
      systemId,
      resolutionStrategy
    });
    
  } catch (error) {
    console.error(`[${systemId}] Error resolving conflict:`, error);
    res.status(500).json({
      message: 'Error resolving transaction conflict',
      systemId,
      error: error.message
    });
  }
}

// Helper function for merging conflicting data
async function mergeConflictingData(transaction, mergeData) {
  // Implement business-specific merge logic
  // This is a simple example - you should customize based on your needs
  
  const merged = {
    amountPaid: mergeData.amountPaid || transaction.amountPaid,
    // Add other fields as needed
  };
  
  // Apply business rules for merging
  if (mergeData.amountPaid && mergeData.amountPaid !== transaction.amountPaid) {
    // Log the amount change
    merged.narration = `Amount updated from ${transaction.amountPaid} to ${mergeData.amountPaid} via conflict resolution`;
  }
  
  return merged;
}

// ==========================================
// MONITORING AND DIAGNOSTICS
// ==========================================

async function getTransactionDiagnostics(req, res) {
  const systemId = getSystemId();
  const { transactionId } = req.params;
  
  try {
    const transaction = await Transaction.findById(transactionId);
    if (!transaction) {
      return res.status(404).json({
        message: 'Transaction not found',
        systemId
      });
    }
    
    // Get related audit logs
    const auditLogs = await require('../models/TransactionAudit').find({
      transactionId
    }).sort({ createdAt: -1 }).limit(10);
    
    // Get conflict history
    const conflictHistory = transaction.concurrencyInfo?.conflictingSystems || [];
    
    res.json({
      systemId,
      transaction: {
        id: transaction._id,
        version: transaction.__v,
        status: transaction.status,
        createdBySystem: transaction.createdBySystem,
        lastModifiedBySystem: transaction.lastModifiedBySystem,
        lockInfo: transaction.lockInfo,
        concurrencyInfo: transaction.concurrencyInfo,
        createdAt: transaction.createdAt,
        updatedAt: transaction.updatedAt
      },
      diagnostics: {
        isLocked: transaction.lockInfo?.isLocked || false,
        lockOwner: transaction.lockInfo?.lockedBy,
        lockExpiry: transaction.lockInfo?.lockExpiry,
        hasConflicts: conflictHistory.length > 0,
        conflictCount: conflictHistory.length,
        lastConflict: transaction.concurrencyInfo?.lastConflictAt,
        auditLogCount: auditLogs.length
      },
      auditLogs: auditLogs,
      conflictHistory: conflictHistory
    });
    
  } catch (error) {
    console.error(`[${systemId}] Error getting diagnostics:`, error);
    res.status(500).json({
      message: 'Error retrieving transaction diagnostics',
      systemId,
      error: error.message
    });
  }
}

// ==========================================
// EXPORTS
// ==========================================

module.exports = {
  // Safe operations
  createNewTransaction: createNewTransactionSafely,
  updateTransaction: updateTransactionSafely,
  transferTransaction: transferTransactionSafely,
  deleteTransaction: deleteTransactionSafely,
  
  // Batch operations
  batchUpdateTransactions,
  
  // Conflict management
  resolveTransactionConflict,
  
  // System management
  getSystemHealth,
  cleanupExpiredLocks,
  forceUnlockTransaction,
  
  // Diagnostics
  getTransactionDiagnostics,
  
  // Utility
  getSystemId,
  getUserInfo
};