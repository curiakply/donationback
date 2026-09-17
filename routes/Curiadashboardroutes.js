const express = require("express");
const router = express.Router();
const Donation = require("../models/Donation");
const Priest = require("../models/Priest");
const Organization = require("../models/Organization");


router.get("/", async (req, res) => {
  try {
    const year = parseInt(req.query.year) || new Date().getFullYear();
    const startDate = new Date(`${year}-01-01`);
    const endDate = new Date(`${year}-12-31T23:59:59.999`);
    const dateFilter = { date: { $gte: startDate, $lte: endDate } };

    // Run ALL queries in parallel
    const [
      priestCount, orgCount, abroadPriests,
      yearTotals, monthlyTrend, currencyBreakdown,
      topOrganizations, topPriests,
      recentDonations, donatingPriestIds,
    ] = await Promise.all([
      Priest.countDocuments(),
      Organization.countDocuments(),
      Priest.countDocuments({ workingRegion: "Abroad" }),

      Donation.aggregate([
        { $match: dateFilter },
        { $group: { _id: null, totalINR: { $sum: "$inrAmount" }, totalDonations: { $sum: 1 }, avgDonation: { $avg: "$inrAmount" } } },
      ]),

      Donation.aggregate([
        { $match: dateFilter },
        { $group: { _id: { $month: "$date" }, totalINR: { $sum: "$inrAmount" }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),

      Donation.aggregate([
        { $match: dateFilter },
        { $group: { _id: "$currency", total: { $sum: "$amount" }, totalINR: { $sum: "$inrAmount" }, count: { $sum: 1 } } },
        { $sort: { totalINR: -1 } },
      ]),

      Donation.aggregate([
        { $match: dateFilter },
        { $group: { _id: "$organization", totalINR: { $sum: "$inrAmount" }, count: { $sum: 1 } } },
        { $sort: { totalINR: -1 } }, { $limit: 10 },
        { $lookup: { from: "organizations", localField: "_id", foreignField: "_id", as: "org" } },
        { $unwind: "$org" },
        { $project: { name: "$org.name", totalINR: 1, count: 1 } },
      ]),

      Donation.aggregate([
        { $match: dateFilter },
        { $group: { _id: "$priest", totalINR: { $sum: "$inrAmount" }, count: { $sum: 1 } } },
        { $sort: { totalINR: -1 } }, { $limit: 10 },
        { $lookup: { from: "priests", localField: "_id", foreignField: "_id", as: "priest" } },
        { $unwind: "$priest" },
        { $project: { name: "$priest.name", hname: "$priest.hname", totalINR: 1, count: 1 } },
      ]),

      Donation.find(dateFilter)
        .populate("priest", "name hname")
        .populate("organization", "name")
        .sort({ date: -1 }).limit(10).lean(),

      Donation.distinct("priest", dateFilter),
    ]);

    // NIL count — runs after distinct resolves (needs its result)
    const nilCount = await Priest.countDocuments({
      _id: { $nin: donatingPriestIds },
      status: { $in: ["active", "inactive", "retired"] },
    });

    const months = Array.from({ length: 12 }, (_, i) => {
      const found = monthlyTrend.find((m) => m._id === i + 1);
      return { month: i + 1, totalINR: found?.totalINR || 0, count: found?.count || 0 };
    });

    res.json({
      year,
      counts: { priestCount, orgCount, abroadPriests, nilCount },
      totals: yearTotals[0] || { totalINR: 0, totalDonations: 0, avgDonation: 0 },
      months,
      currencyBreakdown,
      topOrganizations,
      topPriests,
      recentDonations,
    });
  } catch (err) {
    console.error("Dashboard error:", err);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;