const Family = require("../models/Family");
const Person = require("../models/Person");
const Transaction = require("../models/Transaction");
const mongoose = require("mongoose");
async function getAllPersons(req, res) {
  try {
    const family = await Family.findOne({ id: req.params.familyid,status: 'active'}).exec();
    if (!family) {
      return res.status(404).json({ message: "Family not found." });
    }
    const persons = await Person.find({ family: req.params.familyid,status: 'active' })
      .select("_id name baptismName relation gender education dob occupation status")
      .exec();
    if (!persons) {
      return res.status(404).json({ message: "No persons found." });
    } else {
      return res.status(200).json(persons);
    }
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ message: "An error occurred while fetching persons data." });
  }
}
async function getAllPersonsfamily(req, res) {
  try {
    const { familyIds, year } = req.params;
    const selectedYear = parseInt(year) || new Date().getFullYear();
    
    const family = await Family.findOne({ 
      id: familyIds,
      status: 'active'
    }).exec();
    
    if (!family) {
      return res.status(404).json({ message: "Family not found." });
    }

    const result = await Person.aggregate([
      {
        $match: {
          family: familyIds,
          status: 'active'
        }
      },

      {
        $lookup: {
          from: 'transactions',
          let: { personId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$person', '$$personId'] }
              }
            },
            {
              $group: {
                _id: null,
                totalAmount: { $sum: '$amountPaid' }
              }
            }
          ],
          as: 'totalTransactions'
        }
      },

      {
        $lookup: {
          from: 'transactions',
          let: { personId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$person', '$$personId'] },
                    { $gte: ['$date', new Date(`${selectedYear}-04-01`)] },
                    { $lte: ['$date', new Date(`${selectedYear + 1}-03-31`)] }
                  ]
                }
              }
            },
            {
              $group: {
                _id: null,
                currentYearAmount: { $sum: '$amountPaid' }
              }
            }
          ],
          as: 'yearlyTransactions'
        }
      },

      {
        $addFields: {
          sortOrder: {
            $cond: {
              if: { $eq: ["$relation", "head"] },
              then: 0,
              else: 1
            }
          },
          totalAmount: {
            $ifNull: [{ $arrayElemAt: ['$totalTransactions.totalAmount', 0] }, 0]
          },
          currentYearAmount: {
            $ifNull: [{ $arrayElemAt: ['$yearlyTransactions.currentYearAmount', 0] }, 0]
          },
          formattedDob: {
            $dateToString: {
              format: "%d/%m/%Y",
              date: "$dob"
            }
          }
        }
      },

      {
        $sort: {
          sortOrder: 1,
          name: 1
        }
      },

      {
        $project: {
          _id: 1,
          name: 1,
          baptismName: 1,
          relation: 1,
          gender: 1,
          education: 1,
          dob: "$formattedDob",
          occupation: 1,
          status: 1,
          familyNumber: 1,
          totalAmount: 1,
          currentYearAmount: 1
        }
      }
    ]);

    res.status(200).json(result);

  } catch (err) {
    console.error('Error in getAllPersonsfamily:', err);
    res.status(500).json({ 
      message: "An error occurred while fetching family data.",
      error: err.message 
    });
  }
}
async function getAllPersons1(req, res) {
  try {
    // Extract family IDs from request
    const rawIds = req.params.familyIds || req.query.familyIds || '';

    // Parse and validate input family IDs
    const idStrings = String(rawIds)
      .split(',')  // Split strictly by comma
      .map(id => id.trim())
      .filter(Boolean);

    // Log raw input for debugging
    console.log('Raw Family IDs:', {
      rawIds,
      idStrings
    });

    // Validate IDs - ensure they are numeric
    const validIds = idStrings.filter(id => {
      const numId = Number(id);
      return !isNaN(numId) && numId > 0;
    });

    // Check if any valid IDs exist
    if (validIds.length === 0) {
      return res.status(400).json({
        message: "No valid Family IDs provided.",
        receivedRawIds: rawIds
      });
    }

    console.log('Validated Family IDs:', validIds);

    // Fetch persons for multiple families with multiple query conditions
    const persons = await Person.find({
      $or: [
        { familyId: { $in: validIds } },
        { family: { $in: validIds } },
        { 'family.id': { $in: validIds } }
      ],
      status: 'active'
    })
    .select("_id name baptismName relation gender education dob occupation status family forane familyNumber")
    .lean();

    console.log('Persons Found:', {
      totalPersons: persons.length,
      familyIdsWithPersons: [...new Set(persons.map(p => p.family))]
    });

    // Group persons by family with fallback handling
    const personsByFamily = persons.reduce((acc, person) => {
      // Try multiple ways to get family ID
      const familyId = 
        person.family || 
        person.family || 
        (person.family && person.family.id);

      if (familyId) {
        const key = String(familyId);
        if (!acc[key]) {
          acc[key] = [];
        }
        acc[key].push(person);
      }
      return acc;
    }, {});

    // Identify families with no persons
    const foundFamilyIds = Object.keys(personsByFamily);
    const missingFamilyIds = validIds.filter(
      id => !foundFamilyIds.includes(String(id))
    );

    // Additional debugging
    console.log('Persons By Family:', {
      familyCount: Object.keys(personsByFamily).length,
      missingFamilyIds: missingFamilyIds
    });

    return res.status(200).json({
      message: "Persons retrieved successfully",
      persons: persons,
      personsByFamily: personsByFamily,
      missingFamilyIds: missingFamilyIds,
      totalRequested: validIds.length,
      totalFoundPersons: persons.length
    });

  } catch (error) {
    // Comprehensive error logging
    console.error("Critical Error in getAllPersons:", {
      message: error.message,
      name: error.name,
      stack: error.stack,
      requestParams: req.params,
      requestQuery: req.query
    });

    // Detailed error response
    return res.status(500).json({
      message: "Internal server error while fetching persons",
      error: error.message,
      details: "Unable to process the request",
      requestData: {
        familyIds: req.params.familyIds,
        queryIds: req.query.familyIds
      }
    });
  }
};


// Helper function to calculate age
function calculateAge(dob) {
  if (!dob) return null;
  
  const birthDate = new Date(dob);
  const today = new Date();
  
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
}
// Helper function to get name initials
function getNameInitials(name) {
  if (!name) return '';
  return name
    .split(' ')
    .map(word => word.charAt(0).toUpperCase())
    .join('');
}
async function getStatusHistory(req, res) {
  try {
    const familyId = req.params.familyId;
    
    // Find persons with moved_out or deceased status
    const persons = await Person.find({
      family: familyId,
      status: { $in: ['moved_out', 'deceased'] }
    })
    .select('name baptismName relation status moveOutDate narration')
    .sort({ moveOutDate: -1 });

    res.json(persons);
  } catch (error) {
    console.error('Error fetching status history:', error);
    res.status(500).json({ message: 'Failed to fetch status history' });
  }
}


async function getOnePerson(req, res) {
  try {
    const { personid } = req.params;

    console.log("Fetching person with ID:", personid);

    // Fetch the person document
    const person = await Person.findById(personid)
      .populate([
        { path: "forane", select: "_id name" },
        { path: "parish", select: "_id name" },
      ])
      .lean();

    if (!person) {
      return res.status(404).json({ message: "Person not found." });
    }

    // Fetch family manually using the family ID string
    const family = await Family.findOne({ id: person.family }).lean();

    if (family) {
      person.familyDetails = family; // Attach family details manually
    } else {
      person.familyDetails = null; // Handle missing family case
    }

    res.status(200).json(person);
  } catch (err) {
    console.error("Error in getOnePerson:", {
      personId: req.params.personid,
      error: err.message,
      stack: err.stack,
    });

    res.status(500).json({
      message: "An error occurred while fetching the person's data.",
    });
  }
}
async function Education(req, res) {
  try {
    const educationCategories = await Person.distinct("education");
    res.json(educationCategories);
  } catch (error) {
    console.error("Error fetching education categories:", error);
    res.status(500).json({ message: "Error fetching education categories" });
  }
}
/*
async function getPopulationSummary(req, res) {
  try {
    const { foraneId } = req.params; // Get the foraneId from the route parameter, if provided.
    const { startDate, endDate } = req.query; // Extract date range from query parameters.

    // Build the match query dynamically based on foraneId and date range.
    const matchQuery = { status: "alive" }; // Filter by status (alive).
    
    if (foraneId) {
      matchQuery.forane = new mongoose.Types.ObjectId(foraneId); // Add foraneId to the query.
    }

    if (startDate || endDate) {
      matchQuery.dob = {};
      if (startDate) {
        matchQuery.dob.$gte = new Date(startDate); // Add start date filter.
      }
      if (endDate) {
        matchQuery.dob.$lte = new Date(endDate); // Add end date filter.
      }
    }

    // Aggregate the data for persons who match the query.
    const populationStats = await Person.aggregate([
      {
        $match: matchQuery, // Apply the dynamic match query.
      },
      {
        $group: {
          _id: null, // Group all matching persons together.
          totalPopulation: { $sum: 1 }, // Count all persons.
          totalMales: {
            $sum: {
              $cond: [{ $eq: ["$gender", "male"] }, 1, 0], // Count males.
            },
          },
          totalFemales: {
            $sum: {
              $cond: [{ $eq: ["$gender", "female"] }, 1, 0], // Count females.
            },
          },
        },
      },
    ]);

    // If no data was returned.
    if (!populationStats || populationStats.length === 0) {
      return res.status(404).json({ message: "No persons found." });
    }

    const result = populationStats[0];

    // Return the summary.
    res.status(200).json({
      totalPopulation: result.totalPopulation || 0, // Total population.
      totalMales: result.totalMales || 0,           // Total males.
      totalFemales: result.totalFemales || 0,       // Total females.
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      message: "An error occurred while fetching the population summary.",
    });
  }
}
*/
async function getPopulationSummary (req, res) {
  try {
    const { foraneId } = req.params;
    const { startDate, endDate } = req.query;

    // Build the match query dynamically
    const matchQuery = { status: "alive" };
    
    // Handle foraneId from either params or query
    const forane = foraneId || req.query.foraneId;
    if (forane) {
      matchQuery.forane = new mongoose.Types.ObjectId(forane);
    }

    // Date range filtering
    if (startDate || endDate) {
      matchQuery.dob = {};
      if (startDate) {
        matchQuery.dob.$gte = new Date(startDate);
      }
      if (endDate) {
        matchQuery.dob.$lte = new Date(endDate);
      }
    }

    // Aggregate population statistics
    const populationStats = await Person.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: null,
          totalPopulation: { $sum: 1 },
          totalMales: {
            $sum: {
              $cond: [{ $eq: ["$gender", "male"] }, 1, 0],
            },
          },
          totalFemales: {
            $sum: {
              $cond: [{ $eq: ["$gender", "female"] }, 1, 0],
            },
          },
        },
      },
    ]);

    // Handle empty result
    if (!populationStats || populationStats.length === 0) {
      return res.status(200).json({
        totalPopulation: 0,
        totalMales: 0,
        totalFemales: 0,
      });
    }

    const result = populationStats[0];

    res.status(200).json({
      totalPopulation: result.totalPopulation || 0,
      totalMales: result.totalMales || 0,
      totalFemales: result.totalFemales || 0,
    });
  } catch (err) {
    console.error('Population Summary Error:', err);
    res.status(500).json({
      message: "An error occurred while fetching the population summary.",
      error: err.message
    });
  }
};

// Additional Population-related Methods

async function getPopulationBreakdown (req, res) {
  try {
    const { foraneId, startDate, endDate } = req.query;

    const matchQuery = { status: "alive" };
    
    if (foraneId) {
      matchQuery.forane = new mongoose.Types.ObjectId(foraneId);
    }

    if (startDate || endDate) {
      matchQuery.dob = {};
      if (startDate) matchQuery.dob.$gte = new Date(startDate);
      if (endDate) matchQuery.dob.$lte = new Date(endDate);
    }

    const breakdown = await Person.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: {
            forane: "$forane",
            gender: "$gender"
          },
          count: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: "foranes", // Assuming foranes collection exists
          localField: "_id.forane",
          foreignField: "_id",
          as: "foraneDetails"
        }
      },
      {
        $unwind: "$foraneDetails"
      },
      {
        $project: {
          foraneName: "$foraneDetails.name",
          gender: "$_id.gender",
          count: 1,
          _id: 0
        }
      }
    ]);

    res.status(200).json(breakdown);
  } catch (err) {
    console.error('Population Breakdown Error:', err);
    res.status(500).json({
      message: "An error occurred while fetching population breakdown.",
      error: err.message
    });
  }
};

async function getPopulationByAgeGroups  (req, res)  {
  try {
    const { foraneId } = req.query;

    const matchQuery = { status: "alive" };
    if (foraneId) {
      matchQuery.forane = new mongoose.Types.ObjectId(foraneId);
    }

    const ageGroups = await Person.aggregate([
      { $match: matchQuery },
      {
        $addFields: {
          age: {
            $divide: [
              { $subtract: [new Date(), "$dob"] },
              365 * 24 * 60 * 60 * 1000
            ]
          }
        }
      },
      {
        $bucket: {
          groupBy: "$age",
          boundaries: [0, 18, 35, 50, 65, 100],
          default: "65+",
          output: {
            count: { $sum: 1 },
            persons: { $push: "$$ROOT" }
          }
        }
      }
    ]);

    res.status(200).json(ageGroups);
  } catch (err) {
    console.error('Age Groups Error:', err);
    res.status(500).json({
      message: "An error occurred while fetching age groups.",
      error: err.message
    });
  }
};

async function getGenderDistribution  (req, res) {
  try {
    const { foraneId } = req.query;

    const matchQuery = { status: "alive" };
    if (foraneId) {
      matchQuery.forane = new mongoose.Types.ObjectId(foraneId);
    }

    const genderDistribution = await Person.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: "$gender",
          count: { $sum: 1 },
          percentage: { 
            $avg: { 
              $multiply: [
                { $divide: [1, "$total"] }, 
                100 
              ] 
            } 
          }
        }
      }
    ]);

    res.status(200).json(genderDistribution);
  } catch (err) {
    console.error('Gender Distribution Error:', err);
    res.status(500).json({
      message: "An error occurred while fetching gender distribution.",
      error: err.message
    });
  }
};
async function getPopulationByEducation(req, res) {
  try {
    const { foraneId } = req.query;

    // Build match query
    const matchQuery = { status: "alive" };
    if (foraneId) {
      matchQuery.forane = new mongoose.Types.ObjectId(foraneId);
    }

    // Aggregate population by education levels
    const educationDistribution = await Person.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: "$education", // Group by education field
          count: { $sum: 1 },
          percentage: { 
            $multiply: [
              { $divide: [1, { $sum: { $cond: [{ $eq: ["$status", "alive"] }, 1, 0] } }] }, 
              100 
            ] 
          }
        }
      },
      {
        $project: {
          educationLevel: "$_id",
          count: 1,
          percentage: { $round: ["$percentage", 2] },
          _id: 0
        }
      },
      { $sort: { count: -1 } } // Sort by count in descending order
    ]);

    // If no results, return empty array
    if (!educationDistribution || educationDistribution.length === 0) {
      return res.status(200).json([]);
    }

    res.status(200).json(educationDistribution);
  } catch (err) {
    console.error('Population by Education Error:', err);
    res.status(500).json({
      message: "An error occurred while fetching population by education.",
      error: err.message
    });
  }
};


async function getPopulationOverview(req, res) {
  try {
    const { foraneId } = req.query;

    // Build the match query dynamically
    const matchQuery = { status: "alive" };
    
    if (foraneId) {
      matchQuery.forane = new mongoose.Types.ObjectId(foraneId);
    }

    // Aggregate population statistics
    const populationStats = await Person.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: null,
          totalPopulation: { $sum: 1 },
          totalMales: {
            $sum: {
              $cond: [{ $eq: ["$gender", "male"] }, 1, 0],
            },
          },
          totalFemales: {
            $sum: {
              $cond: [{ $eq: ["$gender", "female"] }, 1, 0],
            },
          }
        }
      }
    ]);

    // Handle empty result
    if (!populationStats || populationStats.length === 0) {
      return res.status(200).json({
        totalPopulation: 0,
        totalMales: 0,
        totalFemales: 0
      });
    }

    const result = populationStats[0];

    res.status(200).json({
      totalPopulation: result.totalPopulation || 0,
      totalMales: result.totalMales || 0,
      totalFemales: result.totalFemales || 0
    });
  } catch (error) {
    console.error('Population Overview Error:', error);
    res.status(500).json({ 
      message: 'Error retrieving population overview', 
      error: error.message 
    });
  }
};

async function getEducationDistribution(req, res) {
  try {
    const { foraneId } = req.query;

    const matchQuery = { status: "alive" };
    if (foraneId) {
      matchQuery.forane = new mongoose.Types.ObjectId(foraneId);
    }

    const educationDistribution = await Person.aggregate([
      { $match: matchQuery },
      {
        $addFields: {
          educationCategory: {
            $switch: {
              branches: [
                {
                  case: { $or: [
                    { $eq: ["$education", "NULL"] },
                    { $eq: ["$education", null] },
                    { $eq: ["$education", ""] }
                  ]},
                  then: "Not Specified"
                },
                // Pre-School and School
                {
                  case: { $or: [
                    { $regexMatch: { input: "$education", regex: /PRE.?SCHOOL/i } },
                    { $regexMatch: { input: "$education", regex: /KINDERGARTEN/i } },
                    { $regexMatch: { input: "$education", regex: /KG/i } }
                  ]},
                  then: "Pre-School"
                },
                {
                  case: { $regexMatch: { input: "$education", regex: /^LP|LOWER PRIMARY/i } },
                  then: "Lower Primary"
                },
                {
                  case: { $regexMatch: { input: "$education", regex: /^UP|UPPER PRIMARY/i } },
                  then: "Upper Primary"
                },
                // High School
                {
                  case: { $regexMatch: { input: "$education", regex: /^8TH|^VIII/i } },
                  then: "8th Standard"
                },
                {
                  case: { $regexMatch: { input: "$education", regex: /^9TH|^IX/i } },
                  then: "9th Standard"
                },
                {
                  case: { $regexMatch: { input: "$education", regex: /^10TH|^X|SSLC/i } },
                  then: "SSLC"
                },
                // Higher Secondary
                {
                  case: { $regexMatch: { input: "$education", regex: /^11TH|^XI/i } },
                  then: "Plus One"
                },
                {
                  case: { $regexMatch: { input: "$education", regex: /^12TH|^XII|PLUS TWO/i } },
                  then: "Plus Two"
                },
                // Undergraduate
                {
                  case: { $regexMatch: { input: "$education", regex: /B\.?TECH/i } },
                  then: "B.Tech"
                },
                {
                  case: { $regexMatch: { input: "$education", regex: /B\.?A/i } },
                  then: "BA"
                },
                {
                  case: { $regexMatch: { input: "$education", regex: /B\.?COM/i } },
                  then: "B.Com"
                },
                {
                  case: { $regexMatch: { input: "$education", regex: /B\.?SC/i } },
                  then: "B.Sc"
                },
                // Postgraduate
                {
                  case: { $regexMatch: { input: "$education", regex: /M\.?TECH/i } },
                  then: "M.Tech"
                },
                {
                  case: { $regexMatch: { input: "$education", regex: /M\.?A/i } },
                  then: "MA"
                },
                {
                  case: { $regexMatch: { input: "$education", regex: /M\.?COM/i } },
                  then: "M.Com"
                },
                {
                  case: { $regexMatch: { input: "$education", regex: /M\.?SC/i } },
                  then: "M.Sc"
                },
                // Professional & Others
                {
                  case: { $regexMatch: { input: "$education", regex: /DIPLOMA/i } },
                  then: "Diploma"
                },
                {
                  case: { $regexMatch: { input: "$education", regex: /PHD|PH\.D/i } },
                  then: "PhD"
                },
                {
                  case: { $regexMatch: { input: "$education", regex: /OTHERS/i } },
                  then: "Others"
                }
              ],
              default: "Others"
            }
          }
        }
      },
      {
        $group: {
          _id: "$educationCategory",
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          educationLevel: "$_id",
          count: 1,
          _id: 0
        }
      },
      { $sort: { count: -1 } }
    ]);

    if (!educationDistribution || educationDistribution.length === 0) {
      return res.status(200).json([]);
    }

    res.status(200).json(educationDistribution);
  } catch (error) {
    console.error('Education Distribution Error:', error);
    res.status(500).json({ 
      message: 'Error retrieving education distribution', 
      error: error.message 
    });
  }
}
async function getOccupationDistribution(req, res) {
  try {
    const { foraneId } = req.query;

    const matchQuery = { status: "alive" };
    if (foraneId) {
      matchQuery.forane = new mongoose.Types.ObjectId(foraneId);
    }

    const occupationDistribution = await Person.aggregate([
      { $match: matchQuery },
      {
        $addFields: {
          occupationCategory: {
            $switch: {
              branches: [
                {
                  case: { $or: [
                    { $eq: ["$occupation", "NULL"] },
                    { $eq: ["$occupation", null] },
                    { $eq: ["$occupation", ""] }
                  ]},
                  then: "Not Specified"
                },
                // Students
                {
                  case: { $regexMatch: { input: "$occupation", regex: /STUDENT/i } },
                  then: "Student"
                },
                // Government Jobs
                {
                  case: { $or: [
                    { $regexMatch: { input: "$occupation", regex: /GOVT|GOVERNMENT/i } },
                    { $regexMatch: { input: "$occupation", regex: /CIVIL.?SERVICE/i } }
                  ]},
                  then: "Government Service"
                },
                // Business
                {
                  case: { $or: [
                    { $regexMatch: { input: "$occupation", regex: /BUSINESS|ENTREPRENEUR/i } },
                    { $regexMatch: { input: "$occupation", regex: /SELF.?EMPLOYED/i } }
                  ]},
                  then: "Business"
                },
                // IT Sector
                {
                  case: { $regexMatch: { input: "$occupation", regex: /SOFTWARE|IT|DEVELOPER|ENGINEER/i } },
                  then: "IT Professional"
                },
                // Medical
                {
                  case: { $or: [
                    { $regexMatch: { input: "$occupation", regex: /DOCTOR|NURSE|MEDICAL/i } },
                    { $regexMatch: { input: "$occupation", regex: /HEALTH.?CARE/i } }
                  ]},
                  then: "Healthcare"
                },
                // Teaching
                {
                  case: { $regexMatch: { input: "$occupation", regex: /TEACHER|PROFESSOR|LECTURER/i } },
                  then: "Teaching"
                },
                // Banking
                {
                  case: { $regexMatch: { input: "$occupation", regex: /BANK|FINANCE|ACCOUNTANT/i } },
                  then: "Banking/Finance"
                },
                // Armed Forces
                {
                  case: { $regexMatch: { input: "$occupation", regex: /ARMY|NAVY|AIR.?FORCE|MILITARY|POLICE/i } },
                  then: "Armed Forces"
                },
                // Homemaker
                {
                  case: { $or: [
                    { $regexMatch: { input: "$occupation", regex: /HOUSE.?WIFE|HOME.?MAKER/i } },
                    { $regexMatch: { input: "$occupation", regex: /HOME.?MAKER/i } }
                  ]},
                  then: "Homemaker"
                },
                // Retired
                {
                  case: { $regexMatch: { input: "$occupation", regex: /RETIRED|PENSION/i } },
                  then: "Retired"
                },
                // Agriculture
                {
                  case: { $regexMatch: { input: "$occupation", regex: /FARMER|AGRICULTURE/i } },
                  then: "Agriculture"
                },
                // Skilled Labor
                {
                  case: { $regexMatch: { input: "$occupation", regex: /MECHANIC|ELECTRICIAN|PLUMBER/i } },
                  then: "Skilled Labor"
                },
                // Sales & Marketing
                {
                  case: { $regexMatch: { input: "$occupation", regex: /SALES|MARKETING/i } },
                  then: "Sales/Marketing"
                },
                // Legal
                {
                  case: { $regexMatch: { input: "$occupation", regex: /LAWYER|ADVOCATE|LEGAL/i } },
                  then: "Legal"
                },
                // Media & Entertainment
                {
                  case: { $regexMatch: { input: "$occupation", regex: /MEDIA|JOURNALIST|ARTIST/i } },
                  then: "Media/Entertainment"
                },
                // Unemployed
                {
                  case: { $regexMatch: { input: "$occupation", regex: /UNEMPLOYED/i } },
                  then: "Unemployed"
                },
                // Gulf/Abroad
                {
                  case: { $regexMatch: { input: "$occupation", regex: /GULF|ABROAD|FOREIGN/i } },
                  then: "Working Abroad"
                },
                // Driver
                {
                  case: { $regexMatch: { input: "$occupation", regex: /DRIVER|TAXI|TRANSPORT/i } },
                  then: "Driver"
                },
                {
                  case: { $regexMatch: { input: "$occupation", regex: /OTHERS/i } },
                  then: "Others"
                }
              ],
              default: "Others"
            }
          }
        }
      },
      {
        $group: {
          _id: "$occupationCategory",
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          occupationLevel: "$_id",
          count: 1,
          _id: 0
        }
      },
      { $sort: { count: -1 } }
    ]);

    if (!occupationDistribution || occupationDistribution.length === 0) {
      return res.status(200).json([]);
    }

    res.status(200).json(occupationDistribution);
  } catch (error) {
    console.error('Occupation Distribution Error:', error);
    res.status(500).json({ 
      message: 'Error retrieving occupation distribution', 
      error: error.message 
    });
  }
}
async function getAgeGroupDistribution(req, res) {
  try {
    const { foraneId } = req.query;

    const matchQuery = { status: "alive" };
    if (foraneId) {
      matchQuery.forane = new mongoose.Types.ObjectId(foraneId);
    }

    const ageGroups = await Person.aggregate([
      { $match: matchQuery },
      {
        $addFields: {
          age: {
            $divide: [
              { $subtract: [new Date(), "$dob"] },
              365 * 24 * 60 * 60 * 1000
            ]
          }
        }
      },
      {
        $bucket: {
          groupBy: "$age",
          boundaries: [0, 18, 35, 50, 65, 100],
          default: "65+",
          output: {
            count: { $sum: 1 },
            persons: { $push: "$$ROOT" }
          }
        }
      }
    ]);

    res.status(200).json(ageGroups);
  } catch (error) {
    console.error('Age Groups Error:', error);
    res.status(500).json({ 
      message: 'Error retrieving age group distribution', 
      error: error.message 
    });
  }
};

async function getAllEducationCategories(req, res) {
  try {
    const educationCategories = await Person.distinct("education");
    res.json(educationCategories);
  } catch (error) {
    console.error("Error fetching education categories:", error);
    res.status(500).json({ message: "Error fetching education categories" });
  }
};

async function createNewPerson(req, res) {
  try {
   /// const person = await Person.findOne({
     // family: req.body.family,
      //name: req.body.name,
   // }).exec();
  //  if (!person) {
      if (req.body.email) {
        const email = await Person.findOne({ email: req.body.email }).exec();
        if (email) {
          res.status(409).json({ message: "Email already exists." });
          return;
        }
      }
      const newPerson = new Person(req.body);
      await newPerson.save();
      res.status(201).json({ message: "Person successfully added to family." });
    //} else {
      //res.status(409).json({ message: "Person already exists." });
   // }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
}

async function updatePerson(req, res) {
  try {
    const person = await Person.findByIdAndUpdate(
      req.params.personid,
      req.body
    );
    if (!person) {
      res.status(404).json({ message: "Person not found." });
    } else {
      res.status(200).json({ message: "Person's data updated successfully." });
    }
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ message: "An error occurred while updating person's data." });
  }
}


async function getAgeGroupDistribution1(req, res) {
  try {
    const { foraneId } = req.query;

    // Build match query
    const matchQuery = { status: "alive" };
    if (foraneId) {
      matchQuery.forane = new mongoose.Types.ObjectId(foraneId);
    }

    const ageDistribution = await Person.aggregate([
      { $match: matchQuery },
      {
        $addFields: {
          age: {
            $floor: {
              $divide: [
                { $subtract: [new Date(), "$dob"] },
                365 * 24 * 60 * 60 * 1000
              ]
            }
          }
        }
      },
      {
        $bucket: {
          groupBy: "$age",
          boundaries: [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80],
          default: "80+",
          output: {
            count: { $sum: 1 }
          }
        }
      },
      {
        $project: {
          _id: {
            $switch: {
              branches: [
                { case: { $eq: ["$_id", "80+"] }, then: "80+" },
                { case: { $eq: ["$_id", 0] }, then: "0-5" },
                { case: { $eq: ["$_id", 5] }, then: "6-10" },
                { case: { $eq: ["$_id", 10] }, then: "11-15" },
                { case: { $eq: ["$_id", 15] }, then: "16-20" },
                { case: { $eq: ["$_id", 20] }, then: "21-25" },
                { case: { $eq: ["$_id", 25] }, then: "26-30" },
                { case: { $eq: ["$_id", 30] }, then: "31-35" },
                { case: { $eq: ["$_id", 35] }, then: "36-40" },
                { case: { $eq: ["$_id", 40] }, then: "41-45" },
                { case: { $eq: ["$_id", 45] }, then: "46-50" },
                { case: { $eq: ["$_id", 50] }, then: "51-55" },
                { case: { $eq: ["$_id", 55] }, then: "56-60" },
                { case: { $eq: ["$_id", 60] }, then: "61-65" },
                { case: { $eq: ["$_id", 65] }, then: "66-70" },
                { case: { $eq: ["$_id", 70] }, then: "71-75" },
                { case: { $eq: ["$_id", 75] }, then: "76-80" }
              ],
              default: "$_id"
            }
          },
          count: 1
        }
      },
      { $sort: { "_id": 1 } }
    ]);

    // Add route configuration
    const routes = [
      {
        path: '/age-groups/distribution',
        method: 'GET',
        handler: getAgeGroupDistribution
      },
      {
        path: '/age-groups/distribution/:foraneId',
        method: 'GET',
        handler: getAgeGroupDistribution
      }
    ];

    if (!ageDistribution || ageDistribution.length === 0) {
      return res.status(200).json([]);
    }

    res.status(200).json(ageDistribution);
  } catch (error) {
    console.error('Age Distribution Error:', error);
    res.status(500).json({ 
      message: 'Error retrieving age distribution', 
      error: error.message 
    });
  }
}
async function deletePerson(req, res) {
  try {
    await Person.findByIdAndDelete(req.params.personid);
    res.status(200).json({ message: "Person deleted successfully." });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ message: "An error occurred while deleting person" });
  }
}

const getFamilyDataWithTransactions = async (req, res) => {
  try {
    const { familyId, year } = req.params;
    const parsedYear = parseInt(year);
        
    // Calculate financial year dates
    const startDate = new Date(`${parsedYear}-04-01`);
    const endDate = new Date(`${parsedYear + 1}-03-31`);

    // Aggregate persons with their transaction data including transferred amounts
    const familyData = await Person.aggregate([
      {
        $match: {
          family: familyId,
          status: 'active'
        }
      },
      // Lookup family details to get familyNumber
      {
        $lookup: {
          from: 'families',
          localField: 'family',
          foreignField: '_id',
          as: 'familyDetails'
        }
      },
      // Lookup all ACTIVE transactions (excludes transferred transactions)
      {
        $lookup: {
          from: 'transactions',
          let: { personId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$person', '$$personId'] },
                    { $eq: ['$status', 'active'] }
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
          as: 'activeTransactions'
        }
      },
      // Lookup all TRANSFERRED transactions received by this person
      {
        $lookup: {
          from: 'transactions',
          let: { personId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$person', '$$personId'] },
                    { $eq: ['$status', 'transferred'] }, // Look for transferred status
                    { $eq: ['$isTransferred', true] }
                  ]
                }
              }
            },
            {
              $group: {
                _id: null,
                transferredAmount: { $sum: '$amountPaid' }
              }
            }
          ],
          as: 'transferredTransactions'
        }
      },
      // Lookup current year ACTIVE transactions
      {
        $lookup: {
          from: 'transactions',
          let: { personId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$person', '$$personId'] },
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
          as: 'currentYearActiveTransactions'
        }
      },
      // Lookup current year TRANSFERRED transactions received by this person
      {
        $lookup: {
          from: 'transactions',
          let: { personId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$person', '$$personId'] },
                    { $eq: ['$status', 'transferred'] },
                    { $eq: ['$isTransferred', true] },
                    { $gte: ['$date', startDate] },
                    { $lte: ['$date', endDate] }
                  ]
                }
              }
            },
            {
              $group: {
                _id: null,
                transferredAmount: { $sum: '$amountPaid' }
              }
            }
          ],
          as: 'currentYearTransferredTransactions'
        }
      },
      // Lookup original transactions (person's own contributions, not transferred)
      {
        $lookup: {
          from: 'transactions',
          let: { personId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$person', '$$personId'] },
                    { $eq: ['$status', 'active'] },
                    {
                      $or: [
                        { $eq: ['$originalPerson', null] }, // No originalPerson field
                        { $eq: ['$originalPerson', '$$personId'] } // originalPerson same as current person
                      ]
                    }
                  ]
                }
              }
            },
            {
              $group: {
                _id: null,
                originalAmount: { $sum: '$amountPaid' }
              }
            }
          ],
          as: 'originalTransactions'
        }
      },
      // Lookup current year original transactions
      {
        $lookup: {
          from: 'transactions',
          let: { personId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$person', '$$personId'] },
                    { $eq: ['$status', 'active'] },
                    { $gte: ['$date', startDate] },
                    { $lte: ['$date', endDate] },
                    {
                      $or: [
                        { $eq: ['$originalPerson', null] },
                        { $eq: ['$originalPerson', '$$personId'] }
                      ]
                    }
                  ]
                }
              }
            },
            {
              $group: {
                _id: null,
                originalAmount: { $sum: '$amountPaid' }
              }
            }
          ],
          as: 'currentYearOriginalTransactions'
        }
      },
      {
        $project: {
          _id: 1,
          name: 1,
          baptismName: 1,
          relation: 1,
          gender: 1,
          dob: {
            $dateToString: {
              format: '%d/%m/%Y',
              date: '$dob',
              onNull: null
            }
          },
          occupation: 1,
          education: 1,
          phone: 1,
          status: 1,
          family: 1,
          parish: 1,
          forane: 1,
          familyNumber: {
            $arrayElemAt: ['$familyDetails.familyNumber', 0]
          },
          // Active transactions amount
          activeAmount: {
            $cond: {
              if: { $gt: [{ $size: '$activeTransactions' }, 0] },
              then: { $arrayElemAt: ['$activeTransactions.totalAmount', 0] },
              else: 0
            }
          },
          // Transferred amount (money received from others)
          transferredAmount: {
            $cond: {
              if: { $gt: [{ $size: '$transferredTransactions' }, 0] },
              then: { $arrayElemAt: ['$transferredTransactions.transferredAmount', 0] },
              else: 0
            }
          },
          // Total amount (active + transferred)
          totalAmount: {
            $add: [
              {
                $cond: {
                  if: { $gt: [{ $size: '$activeTransactions' }, 0] },
                  then: { $arrayElemAt: ['$activeTransactions.totalAmount', 0] },
                  else: 0
                }
              },
              {
                $cond: {
                  if: { $gt: [{ $size: '$transferredTransactions' }, 0] },
                  then: { $arrayElemAt: ['$transferredTransactions.transferredAmount', 0] },
                  else: 0
                }
              }
            ]
          },
          // Current year active amount
          currentYearActiveAmount: {
            $cond: {
              if: { $gt: [{ $size: '$currentYearActiveTransactions' }, 0] },
              then: { $arrayElemAt: ['$currentYearActiveTransactions.totalAmount', 0] },
              else: 0
            }
          },
          // Current year transferred amount
          currentYearTransferredAmount: {
            $cond: {
              if: { $gt: [{ $size: '$currentYearTransferredTransactions' }, 0] },
              then: { $arrayElemAt: ['$currentYearTransferredTransactions.transferredAmount', 0] },
              else: 0
            }
          },
          // Current year total amount (active + transferred)
          currentYearAmount: {
            $add: [
              {
                $cond: {
                  if: { $gt: [{ $size: '$currentYearActiveTransactions' }, 0] },
                  then: { $arrayElemAt: ['$currentYearActiveTransactions.totalAmount', 0] },
                  else: 0
                }
              },
              {
                $cond: {
                  if: { $gt: [{ $size: '$currentYearTransferredTransactions' }, 0] },
                  then: { $arrayElemAt: ['$currentYearTransferredTransactions.transferredAmount', 0] },
                  else: 0
                }
              }
            ]
          },
          // Original amount (person's own contributions only)
          originalAmount: {
            $cond: {
              if: { $gt: [{ $size: '$originalTransactions' }, 0] },
              then: { $arrayElemAt: ['$originalTransactions.originalAmount', 0] },
              else: 0
            }
          },
          // Current year original amount
          currentYearOriginalAmount: {
            $cond: {
              if: { $gt: [{ $size: '$currentYearOriginalTransactions' }, 0] },
              then: { $arrayElemAt: ['$currentYearOriginalTransactions.originalAmount', 0] },
              else: 0
            }
          },
          // Breakdown for display purposes
          breakdown: {
            hasTransferredMoney: {
              $gt: [
                {
                  $cond: {
                    if: { $gt: [{ $size: '$transferredTransactions' }, 0] },
                    then: { $arrayElemAt: ['$transferredTransactions.transferredAmount', 0] },
                    else: 0
                  }
                },
                0
              ]
            },
            totalIncludesTransfers: true
          }
        }
      },
      {
        $sort: {
          relation: 1, // heads first
          name: 1
        }
      }
    ]);

    res.status(200).json(familyData);
  } catch (error) {
    console.error('Error fetching family data with transactions:', error);
    res.status(500).json({
      message: 'Error fetching family data',
      error: error.message
    });
  }
};
// Get status history for a family (moved out and deceased members)
const getFamilyStatusHistory = async (req, res) => {
  try {
    const { familyId } = req.params;

    const statusHistory = await Person.find({
      family: familyId,
      status: { $in: ['moved_out', 'deceased'] }
    }).select('name baptismName relation status moveOutDate narration').sort({ moveOutDate: -1 });

    res.status(200).json(statusHistory);
  } catch (error) {
    console.error('Error fetching status history:', error);
    res.status(500).json({ 
      message: 'Error fetching status history', 
      error: error.message 
    });
  }
};

// Get persons by multiple family IDs
const getPersonsByFamilies = async (req, res) => {
  try {
    const { familyIds } = req.params;
    const familyIdArray = familyIds.split(',');

    const personsByFamily = await Person.aggregate([
      {
        $match: {
          family: { $in: familyIdArray },
          status: 'active'
        }
      },
      {
        $group: {
          _id: '$family',
          persons: {
            $push: {
              _id: '$_id',
              name: '$name',
              baptismName: '$baptismName',
              relation: '$relation',
              gender: '$gender',
              dob: '$dob',
              occupation: '$occupation',
              education: '$education',
              status: '$status',
              familyId: '$family'
            }
          }
        }
      }
    ]);

    // Convert to object format expected by frontend
    const result = {
      personsByFamily: {},
      persons: []
    };

    personsByFamily.forEach(group => {
      result.personsByFamily[group._id] = group.persons;
      result.persons.push(...group.persons);
    });

    res.status(200).json(result);
  } catch (error) {
    console.error('Error fetching persons by families:', error);
    res.status(500).json({ 
      message: 'Error fetching persons by families', 
      error: error.message 
    });
  }
};

module.exports = {
  getAllPersons,
  getAllPersons1,
  getAllPersonsfamily,
  getStatusHistory,
  getOnePerson,
  createNewPerson,
  updatePerson,
  deletePerson,
  getPopulationSummary, 
  getGenderDistribution,
  getPopulationByAgeGroups,
  getPopulationBreakdown,
  getPopulationByEducation,
  Education,
  getPopulationOverview,
  getEducationDistribution,
  getAgeGroupDistribution,
  getAllEducationCategories,
  getOccupationDistribution,
  getAgeGroupDistribution1,
  getFamilyDataWithTransactions,
  getFamilyStatusHistory,
  getPersonsByFamilies,
};
