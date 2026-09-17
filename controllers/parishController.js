const mongoose = require('mongoose');


const Parish = require("../models/Parish");
const Family = require("../models/Family");
const Person = require("../models/Person");
const Koottayma = require("../models/Koottayma");
const Forane = require("../models/Forane");   
async function getAllParishes(req, res) {
  try {
    const parishes = await Parish.find({ forane: req.params.foraneid }).select(
      "_id name phone building street pincode state district forane shortCode"
    );
    if (!parishes) {
      res.status(404).json({ message: "No parish found." });
    } else {
      res.status(200).json(parishes);
    }
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ message: "An error occurred while fetching parish data." });
  }
}
async function searchParishes(req, res) {
  try {
    // Fetch all parishes
    const parishes = await Parish.find({}).select("_id name phone building street pincode state district forane shortCode");

    if (!parishes || parishes.length === 0) {
      return res.status(404).json({ message: "No parishes found." });
    }

    res.status(200).json(parishes);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "An error occurred while fetching parish data." });
  }
}
async function getWAllParishes(req, res) {
  try {
    const parishes = await Parish.find()
      .select("_id name phone building street pincode state district forane shortCode")
      .sort({ name: 1 })
      .lean(); // Returns plain JavaScript objects instead of Mongoose documents (faster)
    
    if (!parishes || parishes.length === 0) {
      return res.status(404).json({ message: "No parishes found." });
    }
    
    res.status(200).json(parishes);
  } catch (err) {
    console.error('Error fetching parishes:', err);
    res.status(500).json({ message: "An error occurred while fetching parish data." });
  }
}


async function getOneParish(req, res) {
  try {
    const parish = await Parish.findById(req.params.parishid).populate(
      "forane",
      "_id name shortCode"
    );
    if (!parish) {
      res.status(404).json({ message: "Parish not found." });
    } else {
      res.status(200).json(parish);
    }
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ message: "An Error Occurred while fetching parish data." });
  }
}

const getMultipleParishes = async (req, res) => {   
  try {
    const rawIds = req.params.parishid || '';

    const idStrings = String(rawIds)
      .split(',')
      .map(id => id.trim())
      .filter(Boolean);

    // Validate IDs
    const validIds = idStrings.filter(id =>
      mongoose.Types.ObjectId.isValid(id)
    );

    console.log('Valid IDs:', validIds);

    // Check if any valid IDs exist
    if (validIds.length === 0) {
      return res.status(400).json({
        message: "No valid Parish IDs provided.",
        receivedRawIds: rawIds,
        parsedIds: idStrings
      });
    }

    // Fetch parishes
    const parishes = await Parish.find({
      _id: { $in: validIds }
    }).select(
      "_id name phone building street pincode state district forane shortCode"
    );

    // Add first 4 letters of parish name to each parish object
    const processedParishes = parishes.map(parish => ({
      ...parish.toObject(),
      nameFirstFourLetters: parish.name ? parish.name.substring(0, 4).toUpperCase() : ''
    }));

    const foundIds = processedParishes.map(parish => parish._id.toString());
    const missingIds = validIds.filter(
      id => !foundIds.includes(id)
    );
console.log(processedParishes);
    return res.status(200).json({
      foundParishes: processedParishes,
      missingParishIds: missingIds,
      totalRequested: idStrings.length,
      totalFound: foundIds.length
    });

  } catch (error) {
    console.error("Error fetching multiple parishes:", {
      message: error.message,
      name: error.name,
      stack: error.stack,
      reqParams: req.params
    });

    res.status(500).json({
      message: "Internal server error while fetching parishes",
      error: error.message,
      params: req.params
    });
  }
};
async function createNewParish(req, res) {
  try {
    const parish = await Parish.findOne({
      forane: req.body.forane,
      name: req.body.name,
    }).exec(); 
    if (!parish) {
      const newparish = new Parish(req.body);
      await newparish.save();

      res.status(201).json({ message: "Parish created successfully." });
    } else {
      res.status(409).json({ message: "Parish already exists." });
    }
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ message: "An error occured while creating parish." });
  }
}
async function generateMissingShortCodes(req, res) {
  try {
    const updatedParishes = await Parish.generateMissingShortCodes();
    
    res.status(200).json({
      message: `Generated short codes for ${updatedParishes.length} parishes.`,
      updatedParishes: updatedParishes.map(parish => ({
        _id: parish._id,
        name: parish.name,
        shortCode: parish.shortCode
      }))
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ 
      message: "An error occurred while generating short codes.",
      error: err.message 
    });
  }
}

async function updateParish(req, res) {
  try {
    const parish = await Parish.findByIdAndUpdate(
      req.params.parishid,
      req.body
    );
    if (!parish) {
      res.status(404).json({ message: "Parish not found." });
    } else {
      res.status(200).json({ message: "Parish updated successfully." });
    }
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ message: "An Error occurred while updating parish." });
  }
}

async function deleteParish(req, res) {
  try {
    const parish = await Parish.findByIdAndDelete(req.params.parishid);
    if (!parish) {
      res.status(404).json({ message: "Parish not found." });
    } else {
      res.status(200).json({ message: "Parish deleted successfully." });
    }
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ message: "An Error Occurred while Deleting Parish" });
  }
}
async function getForaneByParish(req, res) {
  try {
    console.log('Fetching forane for parish:', req.params.parishId);

    const parish = await Parish.findById(req.params.parishId)
      .populate('forane', '_id name')
      .exec();
    
    if (!parish) {
      return res.status(404).json({ message: "Parish not found." });
    }

    if (!parish.forane) {
      return res.status(404).json({ message: "Forane not found for this parish." });
    }

    console.log('Found forane:', parish.forane);

    res.status(200).json({ 
      forane: parish.forane,
      parish: {
        _id: parish._id,
        name: parish.name
      }
    });
  } catch (err) {
    console.error('Error fetching forane:', err);
    res.status(500).json({ 
      message: "An error occurred while fetching forane data.",
      error: err.message 
    });
  }
}
module.exports = {
  getAllParishes,
  getWAllParishes,
  getOneParish,
  createNewParish,
  updateParish,
  deleteParish,
  searchParishes,
  getMultipleParishes,
  getForaneByParish,
  generateMissingShortCodes
};
