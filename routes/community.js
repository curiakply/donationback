const express = require("express");
const router = express.Router();

const {
  getAllCommunities,
  getOneCommunity,
  createNewCommunity,
  updateCommunity,
  deleteCommunity,
} = require("../controllers/communityController");

router.get("/", getAllCommunities);
router.get("/:communityId", getOneCommunity);
router.post("/", createNewCommunity);
router.put("/:communityId", updateCommunity);
router.delete("/:communityId", deleteCommunity);

module.exports = router;
