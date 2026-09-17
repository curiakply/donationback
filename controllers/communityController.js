const Community = require("../models/Community");

async function getAllCommunities(req, res) {
  try {
    const communities = await Community.find().select("_id name phone headOfCommunity");
    if (!communities) {
      res.status(404).json({ message: "No communities found." });
    } else {
      res.status(200).json(communities);
    }
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ message: "An error occurred while fetching communities." });
  }
}

async function getOneCommunity(req, res) {
  try {
    const community = await Community.findById(req.params.communityId);
    if (!community) {
      res.status(404).json({ message: "Community not found." });
    } else {
      res.status(200).json(community);
    }
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ message: "An error occurred while fetching community data." });
  }
}

async function createNewCommunity(req, res) {
  try {
    const community = await Community.findOne({ name: req.body.name }).exec();
    if (!community) {
      const newCommunity = new Community(req.body);
      await newCommunity.save();
      res.status(201).json({ message: "Community created successfully." });
    } else {
      res.status(409).json({ message: "Community already exists." });
    }
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ message: "An error occurred while creating community." });
  }
}

async function updateCommunity(req, res) {
  try {
    const community = await Community.findByIdAndUpdate(
      req.params.communityId,
      req.body
    );
    if (!community) {
      res.status(404).json({ message: "Community not found." });
    } else {
      res.status(200).json({ message: "Community updated successfully." });
    }
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ message: "An error occurred while updating community." });
  }
}

async function deleteCommunity(req, res) {
  try {
    const community = await Community.findByIdAndDelete(req.params.communityId);
    if (!community) {
      res.status(404).json({ message: "Community not found." });
    } else {
      res.status(200).json({ message: "Community deleted successfully." });
    }
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ message: "An error occurred while deleting community." });
  }
}

module.exports = {
  getAllCommunities,
  getOneCommunity,
  createNewCommunity,
  updateCommunity,
  deleteCommunity,
};
