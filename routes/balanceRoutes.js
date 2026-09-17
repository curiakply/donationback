// routes/balanceRoutes.js
const express = require('express');
const router = express.Router();
const BalanceSheet = require('../models/BalanceSheet');
const Transaction = require('../models/FinanceTransation');
const ProjectSettings = require('../models/ProjectSettings');
const mongoose = require("mongoose");
// Get balance for specific entity


const getCurrentFinancialYear = () => {
    const now = new Date();
    const month = now.getMonth() + 1;
    return month >= 4 ? now.getFullYear() : now.getFullYear() - 1;
  };
  
  // Add these three new routes at the top
  router.get('/parish/:id/balance', async (req, res) => {
    try {
      const parishId = req.params.id;
      const year = getCurrentFinancialYear();
      
      const balance = await BalanceSheet.findOne({
        year,
        entity_type: 'parish',
        entity_id: parishId
      });
  
      const currentBalance = balance ? 
        balance.opening_balance + balance.allocated_amount - balance.total_transactions : 
        0;
  
      res.json({ balance: currentBalance });
    } catch (error) {
      console.error('Error fetching parish balance:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error fetching parish balance',
        error: error.message 
      });
    }
  });
  
  router.get('/community/:id/balance', async (req, res) => {
    try {
      const communityId = req.params.id;
      const year = getCurrentFinancialYear();
      
      const balance = await BalanceSheet.findOne({
        year,
        entity_type: 'community',
        entity_id: communityId
      });
  
      const currentBalance = balance ? 
        balance.opening_balance + balance.allocated_amount - balance.total_transactions : 
        0;
  
      res.json({ balance: currentBalance });
    } catch (error) {
      console.error('Error fetching community balance:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error fetching community balance',
        error: error.message 
      });
    }
  });
  
  router.get('/fund/:id/balance', async (req, res) => {
    try {
      const fundId = req.params.id;
      const year = getCurrentFinancialYear();
      
      const balance = await BalanceSheet.findOne({
        year,
        entity_type: 'project',
        entity_id: fundId
      });
  
      const currentBalance = balance ? 
        balance.opening_balance + balance.allocated_amount - balance.total_transactions : 
        0;
  
      res.json({ balance: currentBalance });
    } catch (error) {
      console.error('Error fetching fund balance:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error fetching fund balance',
        error: error.message 
      });
    }
  });
router.get('/balance/:entityType/:entityId/:year', async (req, res) => {
  try {
    const { entityType, entityId, year } = req.params;
    
    const balance = await BalanceSheet.findOne({
      year: parseInt(year),
      entity_type: entityType,
      entity_id: entityId
    });

    if (!balance) {
      return res.json({
        opening_balance: 0,
        allocated_amount: 0,
        total_transactions: 0,
        closing_balance: 0
      });
    }

    res.json(balance);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
router.get('/parish/all/:year', async (req, res) => {
    try {
      const { year } = req.params;
  
      const balances = await BalanceSheet.find({
        year: parseInt(year),
        entity_type: 'parish'
      }).populate('entity_id', 'name');
  
      res.status(200).json(balances);
    } catch (error) {
      console.error('Error fetching parish balances:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error fetching balances',
        error: error.message 
      });
    }
  });
// // Year-end process to transfer balances
// router.post('/year-end/:fromYear', async (req, res) => {
//   const session = await mongoose.startSession();
//   session.startTransaction();

//   try {
//     const fromYear = parseInt(req.params.fromYear);
//     const toYear = fromYear + 1;

//     // Get all balance sheets for the from year
//     const balanceSheets = await BalanceSheet.find({ year: fromYear });

//     // Create new balance sheets for the to year
//     for (const balance of balanceSheets) {
//       await BalanceSheet.create([{
//         year: toYear,
//         entity_type: balance.entity_type,
//         entity_id: balance.entity_id,
//         opening_balance: balance.closing_balance,
//         allocated_amount: 0,
//         total_transactions: 0,
//         closing_balance: balance.closing_balance
//       }], { session });
//     }

//     await session.commitTransaction();
//     res.json({ message: 'Year-end process completed successfully' });
//   } catch (error) {
//     await session.abortTransaction();
//     res.status(500).json({ message: error.message });
//   } finally {
//     session.endSession();
//   }
// });


// Get all community balances for a year
router.get('/community/all/:year', async (req, res) => {
    try {
        const { year } = req.params;

        const balances = await BalanceSheet.find({
            year: parseInt(year),
            entity_type: 'community'
        }).populate('entity_id', 'name');

        res.status(200).json(balances);
    } catch (error) {
        console.error('Error fetching community balances:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error fetching balances',
            error: error.message 
        });
    }
});

// Batch update balances
// router.post('/batch-update', async (req, res) => {
//     const session = await mongoose.startSession();
//     session.startTransaction();

//     try {
//         const { balances } = req.body;

//         if (!balances || !Array.isArray(balances)) {
//             throw new Error('Invalid balance data format');
//         }

//         // Process each balance update
//         const updatePromises = balances.map(async (balance) => {
//             const {
//                 year,
//                 entity_type,
//                 entity_id,
//                 opening_balance,
//                 allocated_amount,
//                 total_transactions
//             } = balance;

//             // Validate required fields
//             if (!year || !entity_type || !entity_id) {
//                 throw new Error('Missing required fields');
//             }

//             // Update or create balance sheet entry
//             return await BalanceSheet.findOneAndUpdate(
//                 {
//                     year,
//                     entity_type,
//                     entity_id
//                 },
//                 {
//                     $set: {
//                         opening_balance: opening_balance || 0,
//                         allocated_amount: allocated_amount || 0,
//                         total_transactions: total_transactions || 0,
//                         updated_at: new Date()
//                     }
//                 },
//                 {
//                     upsert: true,
//                     new: true,
//                     session
//                 }
//             );
//         });

//         // Execute all updates
//         const results = await Promise.all(updatePromises);

//         await session.commitTransaction();
        
//         res.status(200).json({
//             success: true,
//             message: 'Balances updated successfully',
//             data: results
//         });
//     } catch (error) {
//         await session.abortTransaction();
//         console.error('Error updating balances:', error);
//         res.status(500).json({
//             success: false,
//             message: 'Error updating balances',
//             error: error.message
//         });
//     } finally {
//         session.endSession();
//     }
// });..

// Batch update balances
// router.post('/batch-update', async (req, res) => {
//     try {
//       const { balances } = req.body;
  
//       if (!balances?.length) {
//         throw new Error('Invalid balance data format');
//       }
  
//       const results = [];
      
//       for (const balance of balances) {
//         const { year, entity_type, entity_id } = balance;
  
//         if (!year || !entity_type || !entity_id) {
//           throw new Error('Missing required fields');
//         }
  
//         // Get existing balance to preserve values
//         const existingBalance = await BalanceSheet.findOne({
//           year,
//           entity_type,
//           entity_id
//         });
  
//         const updatedBalance = await BalanceSheet.findOneAndUpdate(
//           {
//             year,
//             entity_type,
//             entity_id
//           },
//           {
//             $set: {
//               opening_balance: existingBalance?.opening_balance || 0,
//               allocated_amount: balance.allocated_amount || 0,
//               total_transactions: existingBalance?.total_transactions || 0,
//               updated_at: new Date()
//             }
//           },
//           {
//             upsert: true,
//             new: true
//           }
//         );
  
//         results.push(updatedBalance);
//       }
  
//       res.status(200).json({
//         success: true,
//         message: 'Balances updated successfully',
//         data: results
//       });
//     } catch (error) {
//       console.error('Error updating balances:', error);
//       res.status(500).json({
//         success: false,
//         message: 'Error updating balances',
//         error: error.message
//       });
//     }
//   });


router.post('/batch-update', async (req, res) => {
  try {
    const { balances } = req.body;

    if (!balances?.length) {
      throw new Error('Invalid balance data format');
    }

    const results = [];

    for (const balance of balances) {
      const { year, entity_type, entity_id, opening_balance } = balance;

      if (!year || !entity_type || !entity_id) {
        throw new Error('Missing required fields');
      }

      // Get existing balance to preserve values
      const existingBalance = await BalanceSheet.findOne({
        year,
        entity_type,
        entity_id
      });

      const updatedBalance = await BalanceSheet.findOneAndUpdate(
        {
          year,
          entity_type,
          entity_id
        },
        {
          $set: {
            opening_balance: opening_balance ?? existingBalance?.opening_balance ?? 0,
            allocated_amount: balance.allocated_amount ?? existingBalance?.allocated_amount ?? 0,
            total_transactions: balance.total_transactions ?? existingBalance?.total_transactions ?? 0,
            updated_at: new Date()
          }
        },
        {
          upsert: true,
          new: true
        }
      );

      results.push(updatedBalance);
    }

    res.status(200).json({
      success: true,
      message: 'Balances updated successfully',
      data: results
    });
  } catch (error) {
    console.error('Error updating balances:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating balances',
      error: error.message
    });
  }
});
router.get('/project/all/:year', async (req, res) => {
    try {
        const { year } = req.params;
        
        // Get all balance sheets for projects
        const balanceSheets = await BalanceSheet.find({
            year: parseInt(year),
            entity_type: 'project'
        }).lean();

        // // Get all transactions for the year
        // const startDate = new Date(year, 4, 1); // April 1st
        // const endDate = new Date(parseInt(year) + 1, 3, 31); // March 31st next year

        // const transactions = await Transaction.aggregate([
        //     {
        //         $match: {
        //             date: { 
        //                 $gte: startDate, 
        //                 $lte: endDate 
        //             },
        //             transaction_type: 'otherProject',
        //             status: 'completed'
        //         }
        //     },
        //     {
        //         $group: {
        //             _id: '$fund_id',
        //             total_transactions: { $sum: '$amount' },
        //             last_transaction_date: { $max: '$date' }
        //         }
        //     }
        // ]);

        // // Get allocations
        // const projectSettings = await ProjectSettings.findOne({ year: parseInt(year) });
        // const allocations = projectSettings?.settings || [];

        // // Create transaction map
        // const transactionMap = new Map(
        //     transactions.map(t => [t._id.toString(), t])
        // );

        // // Create allocation map
        // const allocationMap = new Map(
        //     allocations.map(a => [a.project_id.toString(), a])
        // );

        // // Merge data and calculate balances
        // const updatedBalanceSheets = await Promise.all(balanceSheets.map(async (sheet) => {
        //     const transactions = transactionMap.get(sheet.entity_id.toString());
        //     const allocation = allocationMap.get(sheet.entity_id.toString());

        //     // Get previous year's closing balance for opening balance
        //     const previousYear = parseInt(year) - 1;
        //     const previousBalance = await BalanceSheet.findOne({
        //         year: previousYear,
        //         entity_type: 'project',
        //         entity_id: sheet.entity_id
        //     }).lean();

        //     return {
        //         ...sheet,
        //         opening_balance: previousBalance?.closing_balance || 0,
        //         allocated_amount: allocation?.allocated_amount || 0,
        //         total_transactions: transactions?.total_transactions || 0,
        //         last_transaction_date: transactions?.last_transaction_date || null,
        //         current_balance: ((previousBalance?.closing_balance || 0) + 
        //                        (allocation?.allocated_amount || 0) - 
        //                        (transactions?.total_transactions || 0))
        //     };
        // }));

        res.status(200).json(balanceSheets);
    } catch (error) {
        console.error('Error fetching project balances:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error fetching balances',
            error: error.message 
        });
    }
});

// Update or create project balance
router.post('/project/update', async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { 
            year, 
            project_id, 
            opening_balance, 
            allocated_amount 
        } = req.body;

        // Find existing balance sheet
        let balanceSheet = await BalanceSheet.findOne({
            year,
            entity_type: 'project',
            entity_id: project_id
        });

        if (!balanceSheet) {
            // Create new balance sheet if doesn't exist
            balanceSheet = new BalanceSheet({
                year,
                entity_type: 'project',
                entity_id: project_id,
                opening_balance: opening_balance || 0,
                allocated_amount: allocated_amount || 0,
                total_transactions: 0
            });
        } else {
            // Update existing balance sheet
            balanceSheet.opening_balance = opening_balance || 0;
            balanceSheet.allocated_amount = allocated_amount || 0;
        }

        // Calculate transactions
        const startDate = new Date(year, 3, 1);
        const endDate = new Date(parseInt(year) + 1, 2, 31);

        const transactions = await Transaction.aggregate([
            {
                $match: {
                    fund_id: mongoose.Types.ObjectId(project_id),
                    date: { $gte: startDate, $lte: endDate },
                    status: 'completed'
                }
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: '$amount' }
                }
            }
        ]);

        balanceSheet.total_transactions = transactions[0]?.total || 0;
        balanceSheet.closing_balance = 
            balanceSheet.opening_balance + 
            balanceSheet.allocated_amount - 
            balanceSheet.total_transactions;

        await balanceSheet.save({ session });
        await session.commitTransaction();

        res.status(200).json({
            success: true,
            data: balanceSheet
        });
    } catch (error) {
        await session.abortTransaction();
        console.error('Error updating project balance:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating balance',
            error: error.message
        });
    } finally {
        session.endSession();
    }
});

module.exports = router;
// Get specific balance
router.get('/:entityType/:entityId/:year', async (req, res) => {
    try {
        const { entityType, entityId, year } = req.params;

        const balance = await BalanceSheet.findOne({
            year: parseInt(year),
            entity_type: entityType,
            entity_id: entityId
        });

        if (!balance) {
            return res.json({
                opening_balance: 0,
                allocated_amount: 0,
                total_transactions: 0,
                closing_balance: 0
            });
        }

        res.status(200).json(balance);
    } catch (error) {
        console.error('Error fetching balance:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching balance',
            error: error.message
        });
    }
});

// Year-end process
router.post('/year-end/:fromYear/community', async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const fromYear = parseInt(req.params.fromYear);
        const toYear = fromYear + 1;

        // Get all community balance sheets for the from year
        const balanceSheets = await BalanceSheet.find({
            year: fromYear,
            entity_type: 'community'
        });

        // Create new balance sheets for the to year
        const createPromises = balanceSheets.map(async (balance) => {
            const closingBalance = 
                balance.opening_balance + 
                balance.allocated_amount - 
                balance.total_transactions;

            return BalanceSheet.create([{
                year: toYear,
                entity_type: 'community',
                entity_id: balance.entity_id,
                opening_balance: closingBalance,
                allocated_amount: 0,
                total_transactions: 0
            }], { session });
        });

        await Promise.all(createPromises);
        await session.commitTransaction();

        res.status(200).json({
            success: true,
            message: 'Year-end process completed successfully'
        });
    } catch (error) {
        await session.abortTransaction();
        console.error('Error in year-end process:', error);
        res.status(500).json({
            success: false,
            message: 'Error in year-end process',
            error: error.message
        });
    } finally {
        session.endSession();
    }
});

module.exports = router;