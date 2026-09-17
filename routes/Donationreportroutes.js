const express = require("express");
const router = express.Router();
const Donation = require("../models/Donation");
const Priest = require("../models/Priest");

// GET /api/donation-report?from=2024-01-01&to=2024-12-31&country=USA
router.get("/", async (req, res) => {
  try {
    const { from, to, country } = req.query;

    // ── 1. Build priest filter ──────────────────────────────────────────────
    const priestFilter = { status: { $in: ["active", "inactive", "retired"] } };
    if (country) priestFilter.workingCountry = country;

    const priests = await Priest.find(priestFilter)
      .select("name hname workingRegion workingCountry phone email status statusDate statusHistory")
      .sort({ name: 1 })
      .lean();

    const priestIds = priests.map((p) => p._id);

    // ── 2. Build donation date filter ───────────────────────────────────────
    const donationMatch = { priest: { $in: priestIds } };
    if (from || to) {
      donationMatch.date = {};
      if (from) donationMatch.date.$gte = new Date(from);
      if (to) {
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999);
        donationMatch.date.$lte = toDate;
      }
    }

    // ── 3. Aggregate donations per priest ───────────────────────────────────
    const aggregated = await Donation.aggregate([
      { $match: donationMatch },
      {
        $group: {
          _id: "$priest",
          totalAmount: { $sum: "$amount" },
          totalINR: { $sum: "$inrAmount" },
          donationCount: { $sum: 1 },
          currencies: { $addToSet: "$currency" },
          donations: {
            $push: {
              amount: "$amount",
              inrAmount: "$inrAmount",
              currency: "$currency",
              date: "$date",
              purpose: "$purpose",
              organization: "$organization",
              modeOfTransfer: "$modeOfTransfer",
              remarks: "$remarks",
            },
          },
        },
      },
    ]);

    // Map aggregated data by priest id
    const donationMap = {};
    aggregated.forEach((a) => {
      donationMap[a._id.toString()] = a;
    });

    // ── 4. Merge: all priests including NIL contributors ────────────────────
    const report = priests.map((p) => {
      const d = donationMap[p._id.toString()];
      return {
        priest: p,
        totalAmount: d ? d.totalAmount : 0,
        totalINR: d ? d.totalINR : 0,
        donationCount: d ? d.donationCount : 0,
        currencies: d ? d.currencies : [],
        donations: d ? d.donations : [],
        isNil: !d,
      };
    });

    // ── 5. Distinct countries for filter dropdown ───────────────────────────
    const countries = await Priest.distinct("workingCountry", {
      workingCountry: { $ne: "" },
    });

    // ── 6. Summary totals ───────────────────────────────────────────────────
    const summary = {
      totalPriests: report.length,
      contributingPriests: report.filter((r) => !r.isNil).length,
      nilPriests: report.filter((r) => r.isNil).length,
      grandTotalINR: report.reduce((s, r) => s + r.totalINR, 0),
      grandTotalDonations: report.reduce((s, r) => s + r.donationCount, 0),
    };

    res.json({ report, countries, summary });
  } catch (err) {
    console.error("Donation report error:", err);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;