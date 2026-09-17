const TransactionAudit = require('../models/TransactionAudit');
const Transaction = require('../models/Transaction');
const Person = require('../models/Person');
const Family = require('../models/Family');
const Parish = require('../models/Parish');

class AuditLogger {
  static async logTransactionAction(actionData) {
    try {
      const {
        transactionId,
        userId,
        userName,
        userEmail,
        action,
        personId,
        familyId,
        amount,
        previousAmount,
        changes = {},
        description,
        req = null,
        metadata = {}
      } = actionData;

      // Get additional context if IDs are provided
      let personName = null;
      let familyName = null;
      let parishId = null;
      let parishName = null;

      if (personId) {
        try {
          const person = await Person.findById(personId).select('name family');
          if (person) {
            personName = person.name;
            if (!familyId && person.family) {
              familyId = person.family;
            }
          }
        } catch (error) {
          console.warn('Error fetching person details for audit:', error);
        }
      }

      if (familyId) {
        try {
          const family = await Family.findOne({ id: familyId }).select('name parish');
          if (family) {
            familyName = family.name;
            parishId = family.parish;
          }
        } catch (error) {
          console.warn('Error fetching family details for audit:', error);
        }
      }

      if (parishId) {
        try {
          const parish = await Parish.findById(parishId).select('name');
          if (parish) {
            parishName = parish.name;
          }
        } catch (error) {
          console.warn('Error fetching parish details for audit:', error);
        }
      }

      // Extract request details if available
      let ipAddress = null;
      let userAgent = null;
      
      if (req) {
        ipAddress = req.ip || 
                   req.connection?.remoteAddress || 
                   req.headers['x-forwarded-for']?.split(',')[0] || 
                   'unknown';
        userAgent = req.headers['user-agent'] || 'unknown';
      }

      // Create audit log entry
      const auditLog = new TransactionAudit({
        transactionId,
        userId,
        userName,
        userEmail,
        action,
        entityType: 'Transaction',
        personId: personId || null,
        personName,
        familyId: familyId || null,
        familyName,
        parishId,
        parishName,
        amount: amount || null,
        previousAmount: previousAmount || null,
        changes,
        description,
        ipAddress,
        userAgent,
        metadata
      });

      await auditLog.save();
      
      console.log(`Transaction audit logged: ${action} by ${userName} (${userEmail})`);
      return auditLog;

    } catch (error) {
      console.error('Error logging transaction audit:', error);
      // Don't throw error to avoid breaking the main operation
    }
  }

  // Convenience methods for common actions
  static async logCreate(transactionId, userInfo, req = null, additionalData = {}) {
    const transaction = await Transaction.findById(transactionId);
    if (!transaction) return;

    await this.logTransactionAction({
      transactionId,
      userId: userInfo.id,
      userName: userInfo.name,
      userEmail: userInfo.email,
      action: 'CREATE',
      personId: transaction.person,
      familyId: transaction.family,
      amount: transaction.amountPaid,
      description: `Created new transaction of ₹${transaction.amountPaid}`,
      req,
      metadata: {
        date: transaction.date,
        ...additionalData
      }
    });
  }

  static async logUpdate(transactionId, userInfo, oldData, newData, req = null) {
    const changes = this.calculateChanges(oldData, newData);
    
    await this.logTransactionAction({
      transactionId,
      userId: userInfo.id,
      userName: userInfo.name,
      userEmail: userInfo.email,
      action: 'UPDATE',
      personId: newData.person || oldData.person,
      familyId: newData.family || oldData.family,
      amount: newData.amountPaid,
      previousAmount: oldData.amountPaid,
      changes,
      description: `Updated transaction: ${this.formatChanges(changes)}`,
      req
    });
  }

  static async logDelete(transactionData, userInfo, req = null) {
    await this.logTransactionAction({
      transactionId: transactionData._id,
      userId: userInfo.id,
      userName: userInfo.name,
      userEmail: userInfo.email,
      action: 'DELETE',
      personId: transactionData.person,
      familyId: transactionData.family,
      amount: transactionData.amountPaid,
      description: `Deleted transaction of ₹${transactionData.amountPaid}`,
      req,
      metadata: {
        deletedDate: transactionData.date,
        wasTransferred: transactionData.isTransferred
      }
    });
  }

  static async logTransfer(transactionId, userInfo, transferData, req = null) {
    await this.logTransactionAction({
      transactionId,
      userId: userInfo.id,
      userName: userInfo.name,
      userEmail: userInfo.email,
      action: 'TRANSFER',
      personId: transferData.toPerson,
      familyId: transferData.family,
      amount: transferData.amount,
      description: `Transferred ₹${transferData.amount} - Reason: ${transferData.reason}`,
      req,
      metadata: {
        fromPerson: transferData.fromPerson,
        toPerson: transferData.toPerson,
        reason: transferData.reason,
        status: transferData.status
      }
    });
  }

  static async logRollback(transactionId, userInfo, rollbackData, req = null) {
    await this.logTransactionAction({
      transactionId,
      userId: userInfo.id,
      userName: userInfo.name,
      userEmail: userInfo.email,
      action: 'ROLLBACK',
      personId: rollbackData.originalPersonId,
      familyId: rollbackData.family,
      amount: rollbackData.amount,
      description: `Rolled back transaction transfer of ₹${rollbackData.amount}`,
      req,
      metadata: rollbackData
    });
  }

  // Helper methods
  static calculateChanges(oldData, newData) {
    const changes = {};
    const fieldsToTrack = ['amountPaid', 'person', 'family', 'date', 'status'];
    
    fieldsToTrack.forEach(field => {
      if (oldData[field] !== newData[field]) {
        changes[field] = {
          from: oldData[field],
          to: newData[field]
        };
      }
    });
    
    return changes;
  }

  static formatChanges(changes) {
    const changeStrings = Object.entries(changes).map(([field, change]) => {
      return `${field}: ${change.from} → ${change.to}`;
    });
    return changeStrings.join(', ');
  }
}

module.exports = AuditLogger;