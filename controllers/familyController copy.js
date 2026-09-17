const mongoose = require('mongoose');
const Family = require("../models/Family");
const Person = require("../models/Person");
const Parish = require("../models/Parish");
const Koottayma = require("../models/Koottayma");

const Transaction = require('../models/Transaction');
async function getAllFamilies(req, res) {
  try {
    const families = await Family.find({ koottayma: req.params.koottaymaid })
      .select("_id id name head building phone pincode street city district koottayma familyNumber forane")
      .populate("head", "_id name")
      .exec();
    if (!families) {
      res.status(404).json({ message: "No families found." });
    } else {
      res.status(200).json(families); 
    }
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ message: "An error occurred while fetching family data." });
  }
}
const getBulkFamilyData = async (req, res) => {
  try {
    const { foraneId, parishId, koottaymaId } = req.params;

    // Validate all required parameters
    if (!foraneId || !parishId || !koottaymaId) {
      return res.status(400).json({ 
        message: 'Forane ID, Parish ID, and Koottayma ID are required' 
      });
    }

    // Fetch families with all the filters
    const families = await Family.find({ 
      forane: foraneId,
      parish: parishId,
      koottayma: koottaymaId 
    })
      .populate('parish', 'name')
      .populate('koottayma', 'name')
      .lean();

    // Get all family IDs
const familyIds = families.map(family => family.id);


const persons = await Person.aggregate([
  {
    $match: {
      family: { $in: familyIds.map(id => id.toString()) }  // Ensure strings
    }
  },
  {
    $addFields: {
      formattedDob: {
        $let: {
          vars: {
            date: "$dob"
          },
          in: {
            $dateToString: {
              format: "%d/%m/%Y",
              date: "$$date",
              onNull: null
            }
          }
        }
      }
    }
  }
]);


    // Fetch all persons for these families
    // const persons = await Person.find({
    //   family: { $in: familyIds }
    // }).lean();
   
    // Fetch all transactions for these persons
    const personIds = persons.map(person => person._id);
    const transactions = await Transaction.find({
      person: { $in: personIds }
    }).lean();

    // Helper function to calculate total amount for a person
    const calculatePersonTotals = (personId, transactions) => {
      const personTransactions = transactions.filter(t => 
        t.person.toString() === personId.toString()
      );
    
      // Calculate total amount using amountPaid
      const totalAmount = personTransactions.reduce((sum, t) => 
        sum + (t.amountPaid || 0), 0
      );
    
      // Set currentYearAmount same as totalAmount since we want all transactions
      const currentYearAmount = totalAmount;
    
      return { totalAmount, currentYearAmount };
    };

    // Group persons and transactions by family
    const familyData = families.map(family => {
      const familyPersons = persons.filter(person => 
        person.family.toString() === family.id.toString()
      );

      const familyTransactions = transactions.filter(transaction =>
        familyPersons.some(person => 
          person._id.toString() === transaction.person.toString()
        )
      );

      // Calculate totals for each person
      const personsWithTotals = familyPersons.map(person => {
        const totals = calculatePersonTotals(person._id, familyTransactions);
        return {
          _id: person._id,
          name: person.name,
          baptismName: person.baptismName,
          relation: person.relation,
          gender: person.gender,
          dob: person.formattedDob,
          occupation: person.occupation,
          education: person.education,
          totalAmount: totals.totalAmount,
          currentYearAmount: totals.currentYearAmount
        };
      });

      return {
        familyData: {
          _id: family._id,
          name: family.name,
          headname: family.headname,
          building: family.building,
          phone: family.phone,
        },
        parishInfo: family.parish,
        koottaymaInfo: family.koottayma,
        persons: personsWithTotals,
        transactions: familyTransactions
      };
    });

    res.json(familyData);
  } catch (error) {
    console.error('Error in getBulkFamilyData:', error);
    res.status(500).json({ 
      message: 'Error fetching bulk family data',
      error: error.message 
    });
  }
};

async function getAllParFamilies(req, res) {
  try {
    const personCollectionName = Person.collection.collectionName;
   

    const families = await Family.aggregate([
      {
        $match: {
          parish: new mongoose.Types.ObjectId(req.params.parishId)
        }
      },
      {
        $addFields: {
          stringId: { $toString: "$id" }
        }
      },
      {
        $lookup: {
          from: personCollectionName,
          let: { familyId: "$stringId" },
          pipeline: [
            {
              $match: {
                $expr: { 
                  $and: [
                    { $eq: ["$family", "$$familyId"] },
                    { $eq: ["$status", "active"] }
                  ]
                }
              }
            }
          ],
          as: "persons"
        }
      },
      {
        $project: {
          id: "$id",
          name: 1,
          building: { $ifNull: ["$building", "N/A"] },
          pincode: { $ifNull: ["$pincode", "N/A"] },
          phone: { $ifNull: ["$phone", "N/A"] },
          familyNumber: { $ifNull: ["$familyNumber", "N/A"] },
          headname: {
            $let: {
              vars: {
                headPerson: {
                  $arrayElemAt: [
                    {
                      $filter: {
                        input: "$persons",
                        as: "person",
                        cond: { $eq: ["$$person.relation", "head"] }
                      }
                    },
                    0
                  ]
                }
              },
              in: {
                $ifNull: ["$$headPerson.name", "No head assigned"]
              }
            }
          },
          members: {
            $cond: {
              if: { $gt: [{ $size: "$persons" }, 0] },
              then: {
                $reduce: {
                  input: "$persons",
                  initialValue: "",
                  in: {
                    $cond: {
                      if: { $eq: ["$$value", ""] },
                      then: "$$this.name",
                      else: { $concat: ["$$value", ", ", "$$this.name"] }
                    }
                  }
                }
              },
              else: "No members found"
            }
          },
          koottayma: { $ifNull: ["$koottayma", "N/A"] },
          personCount: { $size: "$persons" },
          persons: {
            $map: {
              input: "$persons",
              as: "person",
              in: {
                _id: "$$person._id",
                name: "$$person.name",
                baptismName: "$$person.baptismName",
                relation: "$$person.relation",
                gender: "$$person.gender",
                education: "$$person.education",
                dob: "$$person.dob",
                occupation: "$$person.occupation",
                status: "$$person.status",
                forane: "$$person.forane"
              }
            }
          },
          forane: 1
        }
      },
      { $sort: { name: 1 } }
    ]);

    if (!families || families.length === 0) {
      return res.status(404).json({ message: "No families found." });
    }

    res.status(200).json(families);

  } catch (err) {
    console.error('Error in getAllParFamilies:', err);
    res.status(500).json({ 
      message: "An error occurred while fetching family data.",
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
}
// async function getAllParFamilies(req, res) {
//   try {
//    const families = await Family.find({ parish: req.params.parishId })
//       .select("_id id name head building phone pincode street city district koottayma familyNumber forane")
//       .populate("head", "_id name")
//       .exec();
//     if (!families) {
//       res.status(404).json({ message: "No families found." });
//     } else {
//       res.status(200).json(families); 
//     }
//   } catch (err) {
//     console.error(err);
//     res
//       .status(500)
//       .json({ message: "An error occurred while fetching family data." });
//   }
// }

async function getFamiliesByKoottayma(req, res) {
  try {
    const families = await Family.aggregate([
      // Match families for the specific koottayma
      {
        $match: {
          koottayma: new mongoose.Types.ObjectId(req.params.koottaymaId)
        }
      },
      // Rest of the pipeline is same as above
      {
        $lookup: {
          from: 'persons',
          let: { familyId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $or: [
                      { $eq: ['$familyId', '$$familyId'] },
                      { $eq: ['$family', '$$familyId'] }
                    ]},
                    { $eq: ['$status', 'active'] }
                  ]
                }
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
                dob: 1,
                occupation: 1,
                status: 1,
                forane: 1
              }
            }
          ],
          as: 'persons'
        }
      },
      // Same addFields stage as above
      {
        $addFields: {
          personCount: { $size: '$persons' },
          headname: {
            $let: {
              vars: {
                head: {
                  $arrayElemAt: [
                    {
                      $filter: {
                        input: '$persons',
                        as: 'person',
                        cond: { $eq: ['$$person.relation', 'head'] }
                      }
                    },
                    0
                  ]
                }
              },
              in: { $ifNull: ['$$head.name', 'No head assigned'] }
            }
          },
          members: {
            $reduce: {
              input: '$persons',
              initialValue: '',
              in: {
                $cond: {
                  if: { $eq: ['$$value', ''] },
                  then: '$$this.name',
                  else: { $concat: ['$$value', ', ', '$$this.name'] }
                }
              }
            }
          }
        }
      },
      // Same project stage as above
      {
        $project: {
          id: '$_id',
          name: 1,
          building: { $ifNull: ['$building', 'N/A'] },
          pincode: { $ifNull: ['$pincode', 'N/A'] },
          phone: { $ifNull: ['$phone', 'N/A'] },
          familyNumber: { $ifNull: ['$familyNumber', 'N/A'] },
          headname: 1,
          members: { $ifNull: ['$members', 'No members found'] },
          koottayma: { $ifNull: ['$koottayma', 'N/A'] },
          personCount: 1,
          persons: 1,
          forane: 1
        }
      },
      // Sort by name
      { $sort: { name: 1 } }
    ]);

    if (!families || families.length === 0) {
      return res.status(404).json({ 
        message: "No families found." 
      });
    }

    res.status(200).json(families);

  } catch (err) {
    console.error('Error in getFamiliesByKoottayma:', err);
    res.status(500).json({ 
      message: "An error occurred while fetching family data.",
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
}



async function getOneFamily(req, res) {
  try {
    const family = await Family.findOne({ id: req.params.familyid })
      .populate("forane parish koottayma head", "_id name")
      .exec();
    if (!family) {
      res.status(404).json({ message: "Family not found." });
    } else {
      res.status(200).json(family);
    }
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ message: "An error occurred while fetching family data." });
  }
}

async function createNewFamily(req, res) {
  try {
    // Log the parish field in the request to check if it's passed correctly
    console.log('Requested parish ID:', req.body.parish);

    // Ensure the parish field is an ObjectId
    const parishId = req.body.parish;
    if (!parishId) {
      return res.status(400).json({ message: "Parish ID is missing in request." });
    }

    // Fetch the parish name from the Parish collection using the ObjectId
    const parish = await Parish.findById(parishId).exec();

    if (!parish) {
      return res.status(400).json({ message: "Parish not found." });
    }

    // Log the parish data to ensure it's being fetched correctly
    console.log('Fetched parish:', parish);

    // Extract the first 4 letters of the parish name
    //const parishPrefix = parish.name.slice(0, 4).toUpperCase(); 

    // Step 3: Find the largest familyNumber for the same parish
    const lastpFamily = await Family.find({ parish: parishId })
      .sort({ id: -1 })  // Sort by familyNumber in descending order
      .limit(1); // Get the family with the largest familyNumber

    let familypNumber = 1; // Default to 1 if no families are found

    if (lastpFamily.length > 0) {
      familypNumber = lastpFamily[0].familyNumber + 1; // Increment the family number by 1
    }

    const lastFamily = await Family.find({ })
      .sort({ id: -1 })  // Sort by familyNumber in descending order
      .limit(1); // Get the family with the largest familyNumber

    let familyNumber = 1; // Default to 1 if no families are found

    if (lastFamily.length > 0) {
      familyNumber = lastFamily[0].id + 1; // Increment the family number by 1
    }

    // Step 4: Generate the new family ID using the parish prefix and incremented family number
    const familyId = `${familyNumber}`;
    console.log("Generated family ID:", familyId);

    // Step 5: Check if the family already exists with this familyId
    const existingFamily = await Family.findOne({ id: familyId }).exec();
    if (existingFamily) {
      return res.status(409).json({ message: "Family already exists." });
    }

    // Step 6: Create the new family object
    const newFamily = new Family({ ...req.body, id: familyId, familyNumber: familypNumber });

    // If head of family is specified
    if (req.body.head) {
      const newHeadId = req.body.head;
      const person = await Person.findOne({ _id: newHeadId }).exec();
      if (person.relation === "head") {
        return res.status(400).json({
          message: "Cannot create a new family with an existing head.",
        });
      } else {
        await newFamily.save();
        person.family = newFamily.id;
        person.relation = "head";
        await person.save();
        return res.status(201).json({ message: "Family created successfully." });
      }
    }

    // If no head is specified, just save the family
    await newFamily.save();
    return res.status(201).json({ message: "Family created successfully." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
}







async function updateFamily(req, res) {
  try {
    // Use findById to query by ObjectId from URL parameter  
    const family = await Family.findById(req.params.familyid).exec();
    
    if (!family) {
      return res.status(404).json({ message: "Family not found." });
    }
    
    // const newHeadId = req.body.head;
    
    // if (newHeadId && newHeadId !== family.head?.toString()) {
    //   const currentHead = await Person.findById(family.head).exec();
    //   if (currentHead && currentHead.status === "alive") {
    //     return res.status(400).json({
    //       message: "Cannot change the head of the family unless the current head is deceased or not assigned.",
    //     });
    //   }
    //   await family.updateHead(newHeadId);
    // }

  
    const updateData = { ...req.body };
    delete updateData.id;       
    delete updateData._id;     
    delete updateData.__v;      
 

    Object.assign(family, updateData);
    await family.save();
    
    res.status(200).json({ message: "Family updated successfully." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
}

async function deleteFamily(req, res) {
  try {
    const family = await Family.findOneAndDelete({ id: req.params.familyid });
    if (!family) {
      res.status(404).json({ message: "Family not found." });
    } else {
      res.status(200).json({ message: "Family deleted successfully." });
    }
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ message: "An error occurred while deleting family" });
  }
}
 async function getFamiliesByKoottayma(req, res) {
  try {
    const personCollectionName = Person.collection.collectionName;
    
    const families = await Family.aggregate([
      {
        $match: {
          koottayma: new mongoose.Types.ObjectId(req.params.koottaymaid)
        }
      },
      {
        $addFields: {
          stringId: { $toString: "$id" }
        }
      },
      {
        $lookup: {
          from: personCollectionName,
          let: { familyId: "$stringId" },
          pipeline: [
            {
              $match: {
                $expr: { 
                  $and: [
                    { $eq: ["$family", "$$familyId"] },
                    { $eq: ["$status", "active"] }
                  ]
                }
              }
            }
          ],
          as: "persons"
        }
      },
      {
        $project: {
          id: "$id",
          name: 1,
          building: { $ifNull: ["$building", "N/A"] },
          pincode: { $ifNull: ["$pincode", "N/A"] },
          phone: { $ifNull: ["$phone", "N/A"] },
          familyNumber: { $ifNull: ["$familyNumber", "N/A"] },
          headname: {
            $let: {
              vars: {
                headPerson: {
                  $arrayElemAt: [
                    {
                      $filter: {
                        input: "$persons",
                        as: "person",
                        cond: { $eq: ["$$person.relation", "head"] }
                      }
                    },
                    0
                  ]
                }
              },
              in: {
                $ifNull: ["$$headPerson.name", "No head assigned"]
              }
            }
          },
          members: {
            $cond: {
              if: { $gt: [{ $size: "$persons" }, 0] },
              then: {
                $reduce: {
                  input: "$persons",
                  initialValue: "",
                  in: {
                    $cond: {
                      if: { $eq: ["$$value", ""] },
                      then: "$$this.name",
                      else: { $concat: ["$$value", ", ", "$$this.name"] }
                    }
                  }
                }
              },
              else: "No members found"
            }
          },
          koottayma: { $ifNull: ["$koottayma", "N/A"] },
          personCount: { $size: "$persons" },
          persons: {
            $map: {
              input: "$persons",
              as: "person",
              in: {
                _id: "$$person._id",
                name: "$$person.name",
                baptismName: "$$person.baptismName",
                relation: "$$person.relation",
                gender: "$$person.gender",
                education: "$$person.education",
                dob: "$$person.dob",
                occupation: "$$person.occupation",
                status: "$$person.status",
                forane: "$$person.forane"
              }
            }
          },
          forane: 1
        }
      },
      { $sort: { name: 1 } }
    ]);

    // Debug logging
    

    // Always return an array, even if empty
    res.status(200).json(families || []);
    
  } catch (err) {
    
    // Return empty array on error instead of error status
    res.status(200).json([]);
  }
 }
const getFamiliesWithPersons = async (req, res) => {
  try {
    let families;
    const { koottaymaId, parishId } = req.params;

    // Determine which endpoint was called
    if (koottaymaId) {
      families = await Family.find({ koottayma: koottaymaId });
    } else if (parishId) {
      families = await Family.find({ parish: parishId });
    } else {
      return res.status(400).json({ message: 'Missing required parameters' });
    }

    if (!families || families.length === 0) {
      return res.status(200).json([]);
    }

    // Get all family IDs
    const familyIds = families.map(family => family.id);

    // Fetch all persons for these families
    const personsData = await Person.aggregate([
      {
        $match: {
          family: { $in: familyIds },
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
              status: '$status'
            }
          }
        }
      }
    ]);

    // Create a lookup map for persons by family
    const personsByFamily = {};
    personsData.forEach(group => {
      personsByFamily[group._id] = group.persons;
    });

    // Process families with person details
    const familiesWithDetails = families.map(family => {
      const familyPersons = personsByFamily[family.id] || [];
      const head = familyPersons.find(person => person.relation === 'head');
      
      return {
        id: family.id,
        _id: family._id,
        name: family.name,
        building: family.building || 'N/A',
        pincode: family.pincode || 'N/A',
        phone: family.phone || 'N/A',
        familyNumber: family.familyNumber || family.id,
        headname: head?.name || 'No head assigned',
        members: familyPersons.map(person => person.name).join(', ') || 'No members found',
        koottayma: family.koottayma,
        personCount: familyPersons.length,
        persons: familyPersons,
        forane: family.forane,
      };
    });

    // Sort families by name
    const sortedFamilies = familiesWithDetails.sort((a, b) => 
      a.name.localeCompare(b.name)
    );

    res.status(200).json(sortedFamilies);
  } catch (error) {
    console.error('Error fetching families with persons:', error);
    res.status(500).json({ 
      message: 'Error fetching families with persons', 
      error: error.message 
    });
  }
};
module.exports = {
  getFamiliesByKoottayma,
  getAllFamilies,
  getBulkFamilyData,
  getAllParFamilies,
  getOneFamily,
  createNewFamily,
  updateFamily,
  deleteFamily,
  getFamiliesWithPersons,
};
