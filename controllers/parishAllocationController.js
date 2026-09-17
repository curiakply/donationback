// controllers/parishAllocationController.js
const ParishAllocation = require('../models/ParishAllocation');
const Transaction = require('../models/Transaction');

const saveParishAllocations = async (req, res) => {
    // const session = await mongoose.startSession();
    // session.startTransaction();
  
    try {
      const { year, allocations } = req.body;
  
      // Delete existing allocations for this year
      await ParishAllocation.deleteMany({ year });
  
      // Insert all new allocations
      const savedAllocations = await ParishAllocation.insertMany(
        allocations.map(allocation => ({
          year,
          parishId: allocation.parishId,
          name: allocation.name,
          collection: allocation.collection,
          prelim: allocation.prelim,
          proportionalShare: allocation.proportionalShare,
          totalAllocation: allocation.totalAllocation,
          isFullCollection: allocation.isFullCollection,
          createdAt: new Date(),
          updatedAt: new Date()
        }))
     
      );
  
    
      
      res.status(200).json({
        success: true,
        message: 'All parish allocations saved successfully',
        count: savedAllocations.length
      });
    } catch (error) {
      //await session.abortTransaction();
      console.error('Error in saveParishAllocations:', error);
      
      res.status(500).json({
        success: false,
        message: 'Failed to save parish allocations',
        error: error.message
      });
    } finally {
     
    }
  };

const getParishAllocations = async (req, res) => {
    try {
        const { year } = req.params;
        
        const allocations = await ParishAllocation.find({ year })
            .populate('parishId', 'name')
            .lean();

        res.status(200).json(allocations);
    } catch (error) {
        console.error('Error fetching parish allocations:', error);
        res.status(500).json({ message: 'Error fetching parish allocations', error: error.message });
    }
};

const checkCollectionChanges = async (req, res) => {
    try {
        const { year } = req.params;
        const currentDate = new Date();

        // Get all parish allocations for the year
        const allocations = await ParishAllocation.find({ year });

        const changes = await Promise.all(
            allocations.map(async (allocation) => {
                // Get current collection total
                const currentCollection = await Transaction.aggregate([
                    {
                        $match: {
                            parish: allocation.parishId,
                            status: 'active',
                            date: {
                                $gte: new Date(`${year}-04-01`),
                                $lte: new Date(`${parseInt(year) + 1}-03-31`)
                            }
                        }
                    },
                    {
                        $group: {
                            _id: null,
                            total: { $sum: '$amountPaid' }
                        }
                    }
                ]);

                const newTotal = currentCollection[0]?.total || 0;
                const difference = newTotal - allocation.collection;

                if (difference !== 0) {
                    // Update collection history
                    allocation.collectionHistory.push({
                        amount: newTotal,
                        date: currentDate,
                        change: difference
                    });
                    allocation.collection = newTotal;
                    allocation.lastCollectionUpdate = currentDate;
                    await allocation.save();

                    return {
                        parishId: allocation.parishId,
                        name: allocation.name,
                        oldCollection: allocation.collection,
                        newCollection: newTotal,
                        difference
                    };
                }
                return null;
            })
        );

        const significantChanges = changes.filter(change => change !== null);
        res.status(200).json(significantChanges);
    } catch (error) {
        console.error('Error checking collection changes:', error);
        res.status(500).json({ message: 'Error checking collection changes', error: error.message });
    }
};

module.exports = {
    saveParishAllocations,
    getParishAllocations,
    checkCollectionChanges
};