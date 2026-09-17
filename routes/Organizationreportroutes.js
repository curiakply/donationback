const express = require("express");
const router = express.Router();
const Donation = require("../models/Donation");
const Organization = require("../models/Organization");

// GET /api/organization-report?from=&to=&organization=
router.get("/", async (req, res) => {
  try {
    const { from, to, organization } = req.query;

    // ── 1. All organizations ────────────────────────────────────────────────
    const orgFilter = {};
    if (organization) orgFilter._id = organization;
    const organizations = await Organization.find(orgFilter).sort({ name: 1 }).lean();
    const orgIds = organizations.map((o) => o._id);

    // ── 2. Donation date filter ─────────────────────────────────────────────
    const donationMatch = { organization: { $in: orgIds } };
    if (from || to) {
      donationMatch.date = {};
      if (from) donationMatch.date.$gte = new Date(from);
      if (to) {
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999);
        donationMatch.date.$lte = toDate;
      }
    }

    // ── 3. Aggregate by organization ────────────────────────────────────────
    const aggregated = await Donation.aggregate([
      { $match: donationMatch },
      {
        $group: {
          _id: "$organization",
          totalAmount: { $sum: "$amount" },
          totalINR: { $sum: "$inrAmount" },
          donationCount: { $sum: 1 },
          priests: { $addToSet: "$priest" },
          currencies: { $addToSet: "$currency" },
          donations: {
            $push: {
              _id: "$_id",
              priest: "$priest",
              amount: "$amount",
              inrAmount: "$inrAmount",
              currency: "$currency",
              date: "$date",
              purpose: "$purpose",
              modeOfTransfer: "$modeOfTransfer",
              remarks: "$remarks",
            },
          },
        },
      },
    ]);

    // Populate priest names inside donations
    const Priest = require("../models/Priest");
    const allPriestIds = [...new Set(aggregated.flatMap((a) => a.priests.map((p) => p.toString())))];
    const priestDocs = await Priest.find({ _id: { $in: allPriestIds } }).select("name hname").lean();
    const priestMap = {};
    priestDocs.forEach((p) => { priestMap[p._id.toString()] = p; });

    const donationMap = {};
    aggregated.forEach((a) => {
      const donations = a.donations.map((d) => ({
        ...d,
        priestName: priestMap[d.priest?.toString()]?.name || "",
        priestHname: priestMap[d.priest?.toString()]?.hname || "",
      }));
      donationMap[a._id.toString()] = { ...a, donations };
    });

    // ── 4. Merge with all organizations (include NIL) ───────────────────────
    const report = organizations.map((o) => {
      const d = donationMap[o._id.toString()];
      return {
        organization: o,
        totalAmount: d ? d.totalAmount : 0,
        totalINR: d ? d.totalINR : 0,
        donationCount: d ? d.donationCount : 0,
        priestCount: d ? d.priests.length : 0,
        currencies: d ? d.currencies : [],
        donations: d ? d.donations : [],
        isNil: !d,
      };
    });

    // ── 5. Organization list for dropdown ───────────────────────────────────
    const allOrgs = await Organization.find().sort({ name: 1 }).lean();

    // ── 6. Summary ──────────────────────────────────────────────────────────
    const summary = {
      totalOrganizations: report.length,
      activeOrganizations: report.filter((r) => !r.isNil).length,
      nilOrganizations: report.filter((r) => r.isNil).length,
      grandTotalINR: report.reduce((s, r) => s + r.totalINR, 0),
      grandTotalDonations: report.reduce((s, r) => s + r.donationCount, 0),
    };

    res.json({ report, organizations: allOrgs, summary });
  } catch (err) {
    console.error("Organization report error:", err);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;