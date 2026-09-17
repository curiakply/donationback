// controllers/totalAmountController.js

const TotalAmount = require('../models/TotalAmount');

// Update parish allocation details
const updateParishAllocationDetails = async (req, res) => {
  try {
    const { year } = req.params;
    const {
        total_pre_proportional,
        proportional_share_percentage,
        total_parish_allocation
    } = req.body;

    const totalAmount = await TotalAmount.findOne({ year });
    if (!totalAmount) {
      return res.status(404).json({
        success: false,
        message: 'Total amount record not found for this year'
      });
    }

    await totalAmount.updateParishAllocations(
        total_pre_proportional,
        proportional_share_percentage,
        total_parish_allocation
    );

    res.status(200).json({
      success: true,
      message: 'Parish allocation details updated successfully',
      data: {
        total_pre_proportional: totalAmount.total_pre_proportional,
        proportional_share_percentage: totalAmount.proportional_share_percentage,
        total_parish_allocation: totalAmount.total_parish_allocation
      }
    });
  } catch (error) {
    console.error('Error updating parish allocation details:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating parish allocation details',
      error: error.message
    });
  }
};

// Get parish allocation details
const getParishAllocationDetails = async (req, res) => {
  try {
    const { year } = req.params;
    const details = await TotalAmount.getParishAllocationDetails(year);
    
    if (!details) {
      return res.status(404).json({
        success: false,
        message: 'Allocation details not found for this year'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        parishAmount: details.parish_amount,
        totalPreProportional: details.total_pre_proportional,
        proportionalSharePercentage: details.proportional_share_percentage,
        totalParishAllocation: details.total_parish_allocation
      }
    });
  } catch (error) {
    console.error('Error fetching parish allocation details:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching parish allocation details',
      error: error.message
    });
  }
};

module.exports = {
  updateParishAllocationDetails,
  getParishAllocationDetails
};