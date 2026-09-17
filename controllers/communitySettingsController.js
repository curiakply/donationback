const CommunitySettings = require('../models/CommunitySettings');
const TotalAmount = require('../models/TotalAmount');
const Community = require("../models/Community");
const BalanceSheet = require('../models/BalanceSheet');
const mongoose = require('mongoose');

const communitySettingsController = {
  // Existing methods remain the same...
  getAll: async (req, res) => {
    try {
      const settings = await CommunitySettings.find().lean();
      const totals = await TotalAmount.find().lean();
      
      res.json({
        settings,
        totals
      });
    } catch (error) {
      console.error('Error in getAll:', error);
      res.status(500).json({ message: error.message });
    }
  },

  getByYear: async (req, res) => {
    try {
      const year = parseInt(req.params.year);
      
      if (isNaN(year)) {
        throw new Error('Invalid year parameter');
      }

      const [totals, settings] = await Promise.all([
        TotalAmount.findOne({ year }).lean(),
        CommunitySettings.find({ year }).lean()
      ]);
      
      res.json({
        year,
        total_amount: totals?.total_amount || 0,
        total_allocated: totals?.total_allocated || 0,
        remaining_amount: (totals?.total_amount || 0) - (totals?.total_allocated || 0),
        parish_percentage: totals?.parish_percentage || 0,
        parish_amount: totals?.parish_amount || 0,
        other_projects_percentage: totals?.other_projects_percentage || 0,
        other_projects_amount: totals?.other_projects_amount || 0,
        balance_after_community: totals?.balance_after_community || 0,
        settings: settings || []
      });
    } catch (error) {
      console.error('Error in getByYear:', error);
      res.status(500).json({ message: error.message });
    }
  },

  getByCommunity: async (req, res) => {
    try {
      const { communityId } = req.params;
      
      if (!mongoose.Types.ObjectId.isValid(communityId)) {
        return res.status(400).json({ message: 'Invalid community ID' });
      }

      const settings = await CommunitySettings.find({ 
        community_id: communityId 
      }).lean();

      res.json(settings);
    } catch (error) {
      console.error('Error in getByCommunity:', error);
      res.status(500).json({ message: error.message });
    }
  },

  saveBulkSettings: async (req, res) => {
    try {
      const { 
        settings, 
        total_amount, 
        year,
        parishPercentage,
        otherProjectsPercentage
      } = req.body;
  
      if (!settings || !Array.isArray(settings) || settings.length === 0) {
        throw new Error('Invalid settings data');
      }
  
      const totalPercentage = settings.reduce((acc, curr) => acc + Number(curr.percentage), 0);
      const totalAllocated = settings.reduce((acc, curr) => acc + Number(curr.allocated_amount), 0);
  
      if (totalPercentage > 100) {
        throw new Error('Total percentage cannot exceed 100%');
      }
  
      if (totalAllocated > total_amount) {
        throw new Error('Total allocated amount cannot exceed total amount');
      }
  
      const balanceAfterCommunity = Number(total_amount) - Number(totalAllocated.toFixed(2));
  
      // Get existing values
      const existingTotals = await TotalAmount.findOne({ year }).lean();
      
      // Calculate parish and other project amounts
      const finalParishPercentage = parishPercentage ? Number(parishPercentage) : existingTotals?.parish_percentage || 0;
      const finalOtherProjectsPercentage = otherProjectsPercentage ? Number(otherProjectsPercentage) : existingTotals?.other_projects_percentage || 100;
  
      let parishAmount = 0;
      let otherProjectsAmount = 0;
  
      if (finalParishPercentage > 0) {
        parishAmount = Number((balanceAfterCommunity * finalParishPercentage / 100).toFixed(2));
        otherProjectsAmount = Number((balanceAfterCommunity * finalOtherProjectsPercentage / 100).toFixed(2));
      }
  
      const formattedSettings = settings.map(setting => ({
        community_id: setting.community_id,
        community_name: setting.community_name,
        percentage: Number(Number(setting.percentage).toFixed(2)),
        allocated_amount: Number(Number(setting.allocated_amount).toFixed(2)),
        year
      }));
  
      const totalAmountData = {
        total_amount: Number(total_amount),
        total_allocated: Number(totalAllocated.toFixed(2)),
        balance_after_community: balanceAfterCommunity,
        parish_percentage: finalParishPercentage,
        parish_amount: parishAmount,
        other_projects_percentage: finalOtherProjectsPercentage,
        other_projects_amount: otherProjectsAmount,
        total_pre_proportional: existingTotals?.total_pre_proportional || 0,
        proportional_share_percentage: existingTotals?.proportional_share_percentage || 0,
        total_parish_allocation: existingTotals?.total_parish_allocation || 0,
        year
      };
  
      const updatedTotalAmount = await TotalAmount.findOneAndUpdate(
        { year },
        totalAmountData,
        { upsert: true, new: true, runValidators: true }
      );
  
      await CommunitySettings.deleteMany({ year });
      const savedSettings = await CommunitySettings.insertMany(formattedSettings);
  
      res.status(201).json({
        message: 'Settings saved successfully',
        ...updatedTotalAmount.toObject(),
        settings: savedSettings
      });
    } catch (error) {
      console.error('Error in saveBulkSettings:', error);
      res.status(400).json({ message: error.message });
    }
  },
  // New method for parish allocation
  getParishAllocation: async (req, res) => {
    try {
      const { year } = req.params;
      const totals = await TotalAmount.findOne({ year: parseInt(year) }).lean();
      
      res.json({
        balance_after_community: totals?.balance_after_community || 0,
        parish_percentage: totals?.parish_percentage || 0,
        parish_amount: totals?.parish_amount || 0,
        other_projects_percentage: totals?.other_projects_percentage || 0,
        other_projects_amount: totals?.other_projects_amount || 0
      });
    } catch (error) {
      console.error('Error in getParishAllocation:', error);
      res.status(500).json({ message: error.message });
    }
  },
  getAllCommunitiesWithBalance: async (req, res) => {
    try {
      const year = parseInt(req.params.year);
      
      if (isNaN(year)) {
        return res.status(400).json({ message: "Invalid year parameter" });
      }

      const communities = await Community.find()
        .select("_id name phone headOfCommunity")
        .lean();

      const balances = await BalanceSheet.find({
        year: year,
        entity_type: 'community'
      }).lean();

      const [currentYearData, previousYearData] = await Promise.all([
        Promise.all([
          TotalAmount.findOne({ year }).lean(),
          CommunitySettings.find({ year }).lean()
        ]),
        CommunitySettings.find({ year: year - 1 }).lean()
      ]);

      const [totalAmount, currentSettings] = currentYearData;

      const balanceMap = balances.reduce((acc, balance) => {
        acc[balance.entity_id.toString()] = balance;
        return acc;
      }, {});

      const currentSettingsMap = currentSettings.reduce((acc, setting) => {
        acc[setting.community_id.toString()] = setting;
        return acc;
      }, {});

      const previousSettingsMap = previousYearData.reduce((acc, setting) => {
        acc[setting.community_id.toString()] = setting;
        return acc;
      }, {});

      const mergedData = communities.map(community => {
        const communityId = community._id.toString();
        const balance = balanceMap[communityId] || {};
        const currentSetting = currentSettingsMap[communityId] || {};
        const previousSetting = previousSettingsMap[communityId] || {};

        return {
          ...community,
          percent: currentSetting.percentage || 0,
          amountAllocated: currentSetting.allocated_amount || 0,
          lastYearAmount: previousSetting.allocated_amount || 0,
          openingBalance: balance.opening_balance || 0,
          totalTransactions: balance.total_transactions || 0,
          currentBalance: balance.current_balance || 0,
          year
        };
      });

      res.status(200).json({
        year,
        total_amount: totalAmount?.total_amount || 0,
        total_allocated: totalAmount?.total_allocated || 0,
        remaining_amount: (totalAmount?.total_amount || 0) - (totalAmount?.total_allocated || 0),
        parish_percentage: totalAmount?.parish_percentage || 0,
        parish_amount: totalAmount?.parish_amount || 0,
        other_projects_percentage: totalAmount?.other_projects_percentage || 0,
        other_projects_amount: totalAmount?.other_projects_amount || 0,
        balance_after_community: totalAmount?.balance_after_community || 0,
        communities: mergedData
      });

    } catch (err) {
      console.error('Error in getAllCommunitiesWithBalance:', err);
      res.status(500).json({ 
        success: false,
        message: "An error occurred while fetching communities with balances.",
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
      });
    }
  },
  // Save parish allocation
  saveParishAllocation: async (req, res) => {
    try {
      const {
        parishPercentage,
        parishAmount,
        otherProjectsPercentage,
        otherProjectsAmount,
        year
      } = req.body;

      const totals = await TotalAmount.findOneAndUpdate(
        { year },
        {
          parish_percentage: Number(parishPercentage),
          parish_amount: Number(parishAmount),
          other_projects_percentage: Number(otherProjectsPercentage),
          other_projects_amount: Number(otherProjectsAmount)
        },
        { new: true }
      );

      res.json({
        message: 'Parish allocation saved successfully',
        data: totals
      });
    } catch (error) {
      console.error('Error in saveParishAllocation:', error);
      res.status(500).json({ message: error.message });
    }
  }
};

module.exports = communitySettingsController;