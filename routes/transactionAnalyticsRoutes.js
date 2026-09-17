// backend/routes/transactionAnalyticsRoutes.js - FIXED VERSION
const express = require('express');
const router = express.Router();
const Transaction = require('../models/Transaction');
const Family = require('../models/Family');
const Admin = require('../models/admin.model');
const { verifyToken } = require('../middleware/auth.middleware');

router.use(verifyToken);

// Get daily transaction statistics
router.get('/daily-stats', async (req, res) => {
  try {
    const { date } = req.query;
    console.log('Requested date:', date);
    
    const targetDate = date ? new Date(date) : new Date();
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    console.log('Searching between:', startOfDay, 'and', endOfDay);

    // Find transactions WITHOUT populating createdBy for now
    const transactions = await Transaction.find({
      date: { $gte: startOfDay, $lte: endOfDay },
      status: 'active'
    })
    .populate('family', 'name familyCode')
    .populate('parish', 'name')
    .populate('forane', 'name')
    .populate('person', 'name')
    .sort({ date: -1 });

    console.log('Found transactions:', transactions.length);

    const totalTransactions = transactions.length;
    const totalAmount = transactions.reduce((sum, t) => sum + (Number(t.amountPaid) || 0), 0);
    
    // Count unique families - FIXED: Added null checks
    const uniqueFamilyIds = new Set();
    transactions.forEach(t => {
      if (t.family && t.family._id) {
        uniqueFamilyIds.add(t.family._id.toString());
      }
    });

    // Group by user/admin - Check if createdBy exists in schema
    const userEntries = {};
    let totalAdminsWorked = 0;

    // Check if the first transaction has createdBy field
    if (transactions.length > 0 && transactions[0].createdBy) {
      // If createdBy exists, populate it separately
      const populatedTransactions = await Transaction.find({
        date: { $gte: startOfDay, $lte: endOfDay },
        status: 'active'
      }).populate('createdBy', 'name email').populate('family', '_id');

      populatedTransactions.forEach(t => {
        const userId = t.createdBy?._id?.toString() || 'Unknown';
        const userName = t.createdBy?.name || 'Unknown User';
        const userEmail = t.createdBy?.email || '';

        if (!userEntries[userId]) {
          userEntries[userId] = {
            userId,
            userName,
            userEmail,
            totalEntries: 0,
            totalAmount: 0,
            uniqueFamilies: new Set()
          };
        }

        userEntries[userId].totalEntries++;
        userEntries[userId].totalAmount += Number(t.amountPaid) || 0;
        // FIXED: Added null check
        if (t.family && t.family._id) {
          userEntries[userId].uniqueFamilies.add(t.family._id.toString());
        }
      });

      totalAdminsWorked = Object.keys(userEntries).length;
    } else {
      // If createdBy doesn't exist, show a message
      console.log('createdBy field not found in Transaction schema');
    }

    // Convert userEntries to array
    const userEntriesArray = Object.values(userEntries).map(user => ({
      userId: user.userId,
      userName: user.userName,
      userEmail: user.userEmail,
      totalEntries: user.totalEntries,
      totalAmount: user.totalAmount,
      uniqueFamilies: user.uniqueFamilies.size
    })).sort((a, b) => b.totalEntries - a.totalEntries);

    // Group by parish
    const parishBreakdown = {};
    transactions.forEach(t => {
      const parishName = t.parish?.name || 'Unknown';
      if (!parishBreakdown[parishName]) {
        parishBreakdown[parishName] = {
          count: 0,
          amount: 0,
          uniqueFamilies: new Set()
        };
      }
      parishBreakdown[parishName].count++;
      parishBreakdown[parishName].amount += Number(t.amountPaid) || 0;
      // FIXED: Added null check
      if (t.family && t.family._id) {
        parishBreakdown[parishName].uniqueFamilies.add(t.family._id.toString());
      }
    });

    const parishBreakdownArray = Object.entries(parishBreakdown).map(([name, data]) => ({
      parishName: name,
      totalTransactions: data.count,
      totalAmount: data.amount,
      uniqueFamilies: data.uniqueFamilies.size
    })).sort((a, b) => b.totalAmount - a.totalAmount);

    res.json({
      date: startOfDay.toISOString().split('T')[0],
      summary: {
        totalTransactions,
        totalAmount,
        uniqueFamilies: uniqueFamilyIds.size,
        averagePerTransaction: totalTransactions > 0 ? (totalAmount / totalTransactions).toFixed(2) : 0,
        totalAdminsWorked: totalAdminsWorked || 1
      },
      userEntries: userEntriesArray,
      parishBreakdown: parishBreakdownArray,
      transactions: transactions.map(t => ({
        id: t._id,
        receiptNumber: t.receiptNumber || 'N/A',
        amount: t.amountPaid,
        familyId: t.family?._id,
        familyName: t.family?.name || 'N/A',
        familyCode: t.family?.familyCode || 'N/A',
        parishName: t.parish?.name || 'N/A',
        foraneName: t.forane?.name || 'N/A',
        personName: t.person?.name || 'N/A',
        createdBy: 'Admin',
        createdByEmail: '',
        date: t.date,
        time: t.date ? new Date(t.date).toLocaleTimeString('en-IN', { 
          hour: '2-digit', 
          minute: '2-digit',
          hour12: true 
        }) : 'N/A'
      }))
    });
  } catch (error) {
    console.error('Error fetching daily stats:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get transaction statistics for a date range
router.get('/date-range-stats', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ message: 'Start date and end date are required' });
    }

    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    if (start > end) {
      return res.status(400).json({ message: 'Start date must be before end date' });
    }

    const transactions = await Transaction.find({
      date: { $gte: start, $lte: end },
      status: 'active'
    })
    .populate('family', 'name familyCode')
    .populate('parish', 'name')
    .sort({ date: -1 });

    const totalTransactions = transactions.length;
    const totalAmount = transactions.reduce((sum, t) => sum + (Number(t.amountPaid) || 0), 0);

    // Group by date
    const byDate = {};
    const familiesByDate = {};
    
    transactions.forEach(t => {
      if (!t.date || isNaN(new Date(t.date).getTime())) {
        return;
      }
      
      const date = new Date(t.date).toISOString().split('T')[0];
      if (!byDate[date]) {
        byDate[date] = { count: 0, amount: 0 };
        familiesByDate[date] = new Set();
      }
      byDate[date].count++;
      byDate[date].amount += Number(t.amountPaid) || 0;
      // FIXED: Added null check
      if (t.family && t.family._id) {
        familiesByDate[date].add(t.family._id.toString());
      }
    });

    Object.keys(byDate).forEach(date => {
      byDate[date].familyCount = familiesByDate[date].size;
    });

    // Group by parish
    const byParish = {};
    const familiesByParish = {};
    transactions.forEach(t => {
      const parish = t.parish?.name || 'Unknown';
      if (!byParish[parish]) {
        byParish[parish] = { count: 0, amount: 0 };
        familiesByParish[parish] = new Set();
      }
      byParish[parish].count++;
      byParish[parish].amount += Number(t.amountPaid) || 0;
      // FIXED: Added null check
      if (t.family && t.family._id) {
        familiesByParish[parish].add(t.family._id.toString());
      }
    });

    Object.keys(byParish).forEach(parish => {
      byParish[parish].familyCount = familiesByParish[parish].size;
    });

    // Group by user - Try to populate createdBy if it exists
    const byUser = {};
    try {
      const transactionsWithCreator = await Transaction.find({
        date: { $gte: start, $lte: end },
        status: 'active',
        createdBy: { $exists: true }
      })
      .populate('createdBy', 'name email')
      .populate('family', '_id');

      transactionsWithCreator.forEach(t => {
        const userId = t.createdBy?._id?.toString() || 'Unknown';
        const userName = t.createdBy?.name || 'Unknown User';
        
        if (!byUser[userId]) {
          byUser[userId] = {
            userName,
            userEmail: t.createdBy?.email || '',
            count: 0,
            amount: 0,
            uniqueFamilies: new Set()
          };
        }
        byUser[userId].count++;
        byUser[userId].amount += Number(t.amountPaid) || 0;
        // FIXED: Added null check
        if (t.family && t.family._id) {
          byUser[userId].uniqueFamilies.add(t.family._id.toString());
        }
      });
    } catch (err) {
      console.log('createdBy field not available:', err.message);
    }

    const userSummary = Object.entries(byUser).map(([id, data]) => ({
      userId: id,
      userName: data.userName,
      userEmail: data.userEmail,
      totalEntries: data.count,
      totalAmount: data.amount,
      uniqueFamilies: data.uniqueFamilies.size
    })).sort((a, b) => b.totalEntries - a.totalEntries);

    const uniqueFamilyIds = new Set();
    transactions.forEach(t => {
      // FIXED: Added null check
      if (t.family && t.family._id) {
        uniqueFamilyIds.add(t.family._id.toString());
      }
    });

    res.json({
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0],
      totalTransactions,
      totalAmount,
      uniqueFamilies: uniqueFamilyIds.size,
      byDate: Object.entries(byDate)
        .sort(([a], [b]) => a.localeCompare(b))
        .reduce((obj, [key, val]) => ({ ...obj, [key]: val }), {}),
      byParish,
      byUser: userSummary.length > 0 ? userSummary : [{
        userId: 'system',
        userName: 'System Admin',
        userEmail: '',
        totalEntries: totalTransactions,
        totalAmount: totalAmount,
        uniqueFamilies: uniqueFamilyIds.size
      }],
      averagePerDay: Object.keys(byDate).length > 0 ? (totalTransactions / Object.keys(byDate).length).toFixed(2) : 0,
      averageAmount: totalTransactions > 0 ? (totalAmount / totalTransactions).toFixed(2) : 0
    });
  } catch (error) {
    console.error('Error fetching date range stats:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get parish-wise statistics with unique families
router.get('/parish-stats', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const start = startDate ? new Date(startDate) : new Date(0);
    const end = endDate ? new Date(endDate) : new Date();
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    const transactions = await Transaction.find({
      date: { $gte: start, $lte: end },
      status: 'active'
    })
    .populate('parish', 'name')
    .populate('family', '_id name familyCode');

    const parishStats = {};
    transactions.forEach(t => {
      const parish = t.parish?.name || 'Unknown';
      if (!parishStats[parish]) {
        parishStats[parish] = { 
          totalTransactions: 0, 
          totalAmount: 0, 
          uniqueFamilies: new Set(),
          families: new Set()
        };
      }
      parishStats[parish].totalTransactions++;
      parishStats[parish].totalAmount += Number(t.amountPaid) || 0;
      // FIXED: Added null check
      if (t.family && t.family._id) {
        parishStats[parish].uniqueFamilies.add(t.family._id.toString());
        parishStats[parish].families.add(JSON.stringify({
          id: t.family._id,
          name: t.family.name,
          code: t.family.familyCode
        }));
      }
    });

    const result = Object.entries(parishStats).map(([parish, stats]) => ({
      parish,
      totalTransactions: stats.totalTransactions,
      totalAmount: stats.totalAmount,
      uniqueFamilies: stats.uniqueFamilies.size,
      averagePerTransaction: stats.totalTransactions > 0 
        ? (stats.totalAmount / stats.totalTransactions).toFixed(2) 
        : 0,
      averagePerFamily: stats.uniqueFamilies.size > 0
        ? (stats.totalAmount / stats.uniqueFamilies.size).toFixed(2)
        : 0
    })).sort((a, b) => b.totalAmount - a.totalAmount);

    res.json({
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0],
      parishStats: result,
      totalParishes: result.length
    });
  } catch (error) {
    console.error('Error fetching parish stats:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Keep other routes as they were...
router.get('/family-completion', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) {
      return res.status(400).json({ message: 'Start date and end date are required' });
    }

    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const familyTransactions = await Transaction.aggregate([
      {
        $match: {
          date: { $gte: start, $lte: end },
          status: 'active',
          family: { $exists: true, $ne: null }
        }
      },
      {
        $group: {
          _id: '$family',
          totalTransactions: { $sum: 1 },
          totalAmount: { $sum: '$amountPaid' },
          lastTransaction: { $max: '$date' },
          firstTransaction: { $min: '$date' }
        }
      },
      {
        $lookup: {
          from: 'families',
          localField: '_id',
          foreignField: '_id',
          as: 'familyInfo'
        }
      },
      {
        $unwind: { path: '$familyInfo', preserveNullAndEmptyArrays: true }
      },
      {
        $project: {
          familyId: '$_id',
          familyName: '$familyInfo.name',
          familyCode: { $ifNull: ['$familyInfo.familyCode', { $toString: '$_id' }] },
          parishName: '$familyInfo.parishName',
          totalTransactions: 1,
          totalAmount: 1,
          lastTransaction: 1,
          firstTransaction: 1
        }
      },
      { $sort: { totalAmount: -1 } }
    ]);

    const totalFamiliesWithTransactions = familyTransactions.length;
    const totalRevenue = familyTransactions.reduce((sum, f) => sum + (f.totalAmount || 0), 0);
    const allFamiliesCount = await Family.countDocuments();

    res.json({
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0],
      summary: {
        totalFamilies: allFamiliesCount,
        completedFamilies: totalFamiliesWithTransactions,
        pendingFamilies: allFamiliesCount - totalFamiliesWithTransactions,
        completionRate: allFamiliesCount > 0 ? ((totalFamiliesWithTransactions / allFamiliesCount) * 100).toFixed(2) : 0,
        totalRevenue,
        averagePerFamily: totalFamiliesWithTransactions > 0 ? (totalRevenue / totalFamiliesWithTransactions).toFixed(2) : 0
      },
      families: familyTransactions
    });
  } catch (error) {
    console.error('Error fetching family completion:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.get('/payment-analysis', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const start = startDate ? new Date(startDate) : new Date(0);
    const end = endDate ? new Date(endDate) : new Date();

    const transactions = await Transaction.find({
      date: { $gte: start, $lte: end },
      status: 'active'
    });

    const totalAmount = transactions.reduce((sum, t) => sum + (Number(t.amountPaid) || 0), 0);

    res.json({
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0],
      paymentMethods: [{
        method: 'All Payments',
        count: transactions.length,
        totalAmount,
        averageAmount: transactions.length > 0 ? (totalAmount / transactions.length).toFixed(2) : 0
      }]
    });
  } catch (error) {
    console.error('Error fetching payment analysis:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.get('/type-analysis', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const start = startDate ? new Date(startDate) : new Date(0);
    const end = endDate ? new Date(endDate) : new Date();

    const transactions = await Transaction.find({
      date: { $gte: start, $lte: end },
      status: 'active'
    });

    const totalAmount = transactions.reduce((sum, t) => sum + (Number(t.amountPaid) || 0), 0);

    res.json({
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0],
      transactionTypes: [{
        type: 'All Transactions',
        count: transactions.length,
        totalAmount,
        averageAmount: transactions.length > 0 ? (totalAmount / transactions.length).toFixed(2) : 0
      }]
    });
  } catch (error) {
    console.error('Error fetching type analysis:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.get('/top-families', async (req, res) => {
  try {
    const { startDate, endDate, limit = 20 } = req.query;
    const start = startDate ? new Date(startDate) : new Date(0);
    const end = endDate ? new Date(endDate) : new Date();

    const topFamilies = await Transaction.aggregate([
      {
        $match: {
          date: { $gte: start, $lte: end },
          status: 'active',
          family: { $exists: true, $ne: null }
        }
      },
      {
        $group: {
          _id: '$family',
          transactionCount: { $sum: 1 },
          totalAmount: { $sum: '$amountPaid' }
        }
      },
      {
        $lookup: {
          from: 'families',
          localField: '_id',
          foreignField: '_id',
          as: 'familyData'
        }
      },
      { $unwind: { path: '$familyData', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          familyId: '$_id',
          familyName: '$familyData.name',
          familyCode: { $ifNull: ['$familyData.familyCode', { $toString: '$_id' }] },
          parishName: '$familyData.parishName',
          transactionCount: 1,
          totalAmount: 1
        }
      },
      { $sort: { totalAmount: -1 } },
      { $limit: parseInt(limit) }
    ]);

    res.json({ topFamilies, count: topFamilies.length });
  } catch (error) {
    console.error('Error fetching top families:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.get('/monthly-comparison', async (req, res) => {
  try {
    const { year } = req.query;
    const targetYear = year ? parseInt(year) : new Date().getFullYear();

    const monthlyData = await Transaction.aggregate([
      {
        $match: {
          date: {
            $gte: new Date(targetYear, 0, 1),
            $lte: new Date(targetYear, 11, 31, 23, 59, 59)
          },
          status: 'active'
        }
      },
      {
        $group: {
          _id: { $month: '$date' },
          count: { $sum: 1 },
          amount: { $sum: '$amountPaid' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const result = monthlyData.map(m => ({
      month: monthNames[m._id - 1],
      monthNumber: m._id,
      transactions: m.count,
      amount: m.amount
    }));

    res.json({ year: targetYear, monthlyData: result });
  } catch (error) {
    console.error('Error fetching monthly comparison:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;