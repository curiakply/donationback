const Person = require("../models/Person");
const Family = require("../models/Family");
const Transaction = require("../models/Transaction");
const mongoose = require("mongoose");

/**
 * Search persons with advanced filtering
 */
exports.searchPersons = async (req, res) => {
  try {
    const { filter = {}, page = 1, limit = 50, sort = { createdAt: -1 } } = req.body;

    // Build the query
    const query = buildQuery(filter);

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Execute query with population
    const persons = await Person.find(query)
      .populate('forane', 'name')
      .populate('parish', 'name')
      .populate('family', 'name familyNumber')
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean();

    // Get total count for pagination
    const total = await Person.countDocuments(query);

    res.json({
      success: true,
      data: persons,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalRecords: total,
        hasNext: page * limit < total,
        hasPrev: page > 1,
        limit
      }
    });
  } catch (error) {
    console.error('Error searching persons:', error);
    res.status(500).json({
      success: false,
      message: 'Error searching persons',
      error: error.message
    });
  }
};

/**
 * Search families with advanced filtering
 */
exports.searchFamilies = async (req, res) => {
  try {
    const { filter = {}, page = 1, limit = 50, sort = { familyNumber: 1 } } = req.body;

    const query = buildQuery(filter);
    const skip = (page - 1) * limit;

    const families = await Family.find(query)
      .populate('forane', 'name')
      .populate('parish', 'name')
      .populate('koottayma', 'name')
      .populate('head', 'name')
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Family.countDocuments(query);

    res.json({
      success: true,
      data: families,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalRecords: total,
        hasNext: page * limit < total,
        hasPrev: page > 1,
        limit
      }
    });
  } catch (error) {
    console.error('Error searching families:', error);
    res.status(500).json({
      success: false,
      message: 'Error searching families',
      error: error.message
    });
  }
};

/**
 * Search transactions with advanced filtering
 */
exports.searchTransactions = async (req, res) => {
  try {
    const { filter = {}, page = 1, limit = 50, sort = { date: -1 } } = req.body;

    const query = buildQuery(filter);
    const skip = (page - 1) * limit;

    const transactions = await Transaction.find(query)
      .populate('forane', 'name')
      .populate('parish', 'name')
      .populate('person', 'name baptismName')
      .populate('originalPerson', 'name')
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Transaction.countDocuments(query);

    res.json({
      success: true,
      data: transactions,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalRecords: total,
        hasNext: page * limit < total,
        hasPrev: page > 1,
        limit
      }
    });
  } catch (error) {
    console.error('Error searching transactions:', error);
    res.status(500).json({
      success: false,
      message: 'Error searching transactions',
      error: error.message
    });
  }
};

/**
 * Combined search across persons, families, and transactions
 */
exports.combinedSearch = async (req, res) => {
  try {
    const { filter = {}, searchType = 'person', page = 1, limit = 50 } = req.body;

    let results;

    switch (searchType) {
      case 'person':
        results = await searchPersonsInternal(filter, page, limit);
        break;
      case 'family':
        results = await searchFamiliesInternal(filter, page, limit);
        break;
      case 'transaction':
        results = await searchTransactionsInternal(filter, page, limit);
        break;
      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid search type. Use: person, family, or transaction'
        });
    }

    res.json(results);
  } catch (error) {
    console.error('Error in combined search:', error);
    res.status(500).json({
      success: false,
      message: 'Error performing search',
      error: error.message
    });
  }
};

/**
 * Get filter statistics
 */
exports.getFilterStats = async (req, res) => {
  try {
    const { filter = {} } = req.body;
    const query = buildQuery(filter);

    // Get counts
    const [personCount, familyCount, transactionCount] = await Promise.all([
      Person.countDocuments(query),
      Family.countDocuments(query),
      Transaction.countDocuments(query)
    ]);

    // Get additional statistics for persons
    const personStats = await Person.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalPersons: { $sum: 1 },
          maleCount: {
            $sum: { $cond: [{ $eq: ['$gender', 'male'] }, 1, 0] }
          },
          femaleCount: {
            $sum: { $cond: [{ $eq: ['$gender', 'female'] }, 1, 0] }
          },
          activeCount: {
            $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
          },
          inactiveCount: {
            $sum: { $cond: [{ $eq: ['$status', 'inactive'] }, 1, 0] }
          },
          deceasedCount: {
            $sum: { $cond: [{ $eq: ['$status', 'deceased'] }, 1, 0] }
          }
        }
      }
    ]);

    res.json({
      success: true,
      stats: {
        persons: personStats[0] || {
          totalPersons: 0,
          maleCount: 0,
          femaleCount: 0,
          activeCount: 0,
          inactiveCount: 0,
          deceasedCount: 0
        },
        families: familyCount,
        transactions: transactionCount
      }
    });
  } catch (error) {
    console.error('Error getting filter stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting statistics',
      error: error.message
    });
  }
};

/**
 * Export filtered data
 */
exports.exportFilteredData = async (req, res) => {
  try {
    const { filter = {}, searchType = 'person', format = 'json' } = req.body;
    const query = buildQuery(filter);

    let data;

    switch (searchType) {
      case 'person':
        data = await Person.find(query)
          .populate('forane', 'name')
          .populate('parish', 'name')
          .populate('family', 'name familyNumber')
          .lean();
        break;
      case 'family':
        data = await Family.find(query)
          .populate('forane', 'name')
          .populate('parish', 'name')
          .populate('koottayma', 'name')
          .populate('head', 'name')
          .lean();
        break;
      case 'transaction':
        data = await Transaction.find(query)
          .populate('forane', 'name')
          .populate('parish', 'name')
          .populate('person', 'name baptismName')
          .lean();
        break;
      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid search type'
        });
    }

    if (format === 'json') {
      res.json({
        success: true,
        data,
        count: data.length
      });
    } else if (format === 'csv') {
      // Convert to CSV (you'll need to implement CSV conversion)
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=${searchType}-export-${Date.now()}.csv`);
      // Implement CSV conversion here
      res.send('CSV export not yet implemented');
    }
  } catch (error) {
    console.error('Error exporting data:', error);
    res.status(500).json({
      success: false,
      message: 'Error exporting data',
      error: error.message
    });
  }
};

// Helper function to build MongoDB query from filter object
function buildQuery(filter) {
  const query = {};

  Object.entries(filter).forEach(([key, value]) => {
    // Handle nested fields (e.g., "family.name")
    if (key.includes('.')) {
      const [parent, child] = key.split('.');
      if (!query[parent]) query[parent] = {};
      
      if (typeof value === 'object' && !Array.isArray(value)) {
        // Handle range queries
        if (value.$gte || value.$lte || value.$gt || value.$lt) {
          query[key] = value;
        } else if (value.$regex) {
          query[key] = value;
        }
      } else {
        query[key] = value;
      }
    } else {
      // Direct field mapping
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        // Handle MongoDB operators ($gte, $lte, $regex, etc.)
        if (value.$gte || value.$lte || value.$gt || value.$lt || value.$regex || value.$in) {
          query[key] = value;
        } else {
          query[key] = value;
        }
      } else {
        // Direct value
        query[key] = value;
      }
    }
  });

  return query;
}

// Internal search functions for reusability
async function searchPersonsInternal(filter, page, limit) {
  const query = buildQuery(filter);
  const skip = (page - 1) * limit;

  const persons = await Person.find(query)
    .populate('forane', 'name')
    .populate('parish', 'name')
    .populate('family', 'name familyNumber')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  const total = await Person.countDocuments(query);

  return {
    success: true,
    data: persons,
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalRecords: total,
      hasNext: page * limit < total,
      hasPrev: page > 1,
      limit
    }
  };
}

async function searchFamiliesInternal(filter, page, limit) {
  const query = buildQuery(filter);
  const skip = (page - 1) * limit;

  const families = await Family.find(query)
    .populate('forane', 'name')
    .populate('parish', 'name')
    .populate('koottayma', 'name')
    .populate('head', 'name')
    .sort({ familyNumber: 1 })
    .skip(skip)
    .limit(limit)
    .lean();

  const total = await Family.countDocuments(query);

  return {
    success: true,
    data: families,
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalRecords: total,
      hasNext: page * limit < total,
      hasPrev: page > 1,
      limit
    }
  };
}

async function searchTransactionsInternal(filter, page, limit) {
  const query = buildQuery(filter);
  const skip = (page - 1) * limit;

  const transactions = await Transaction.find(query)
    .populate('forane', 'name')
    .populate('parish', 'name')
    .populate('person', 'name baptismName')
    .populate('originalPerson', 'name')
    .sort({ date: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  const total = await Transaction.countDocuments(query);

  return {
    success: true,
    data: transactions,
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalRecords: total,
      hasNext: page * limit < total,
      hasPrev: page > 1,
      limit
    }
  };
}