const express = require("express");
const router = express.Router();
const dc = require("../controllers/Donationcontroller");

// Donations only — orgs already have their own router
router.get("/", dc.getAllDonations);
router.get("/summary", dc.getDonationSummary);
router.post("/", dc.createDonation);
router.put("/:id", dc.updateDonation);
router.delete("/:id", dc.deleteDonation);

module.exports = router;