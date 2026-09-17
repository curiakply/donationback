const express = require("express");
const router = express.Router();
const Donation = require("../models/Donation");
const Priest = require("../models/Priest");
const Organization = require("../models/Organization");

// GET /api/priest-ledger?priest=&from=&to=
router.get("/", async (req, res) => {
  try {
    const { priest, from, to } = req.query;

    // ── 1. Priest list for dropdown ─────────────────────────────────────────
    const priests = await Priest.find({ status: { $in: ["active", "inactive", "retired"] } })
      .select("name hname workingCountry workingRegion phone")
      .sort({ name: 1 })
      .lean();

    // If no priest selected, return just the list
    if (!priest) {
      return res.json({ priests, ledger: [], summary: null });
    }

    // ── 2. Fetch priest details ─────────────────────────────────────────────
    const priestDoc = await Priest.findById(priest)
      .select("name hname workingCountry workingRegion phone email")
      .lean();
    if (!priestDoc) return res.status(404).json({ message: "Priest not found" });

    // ── 3. Build donation filter ────────────────────────────────────────────
    const match = { priest: priestDoc._id };
    if (from || to) {
      match.date = {};
      if (from) match.date.$gte = new Date(from);
      if (to) {
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999);
        match.date.$lte = toDate;
      }
    }

    // ── 4. Get donations sorted by date (ledger order) ──────────────────────
    const donations = await Donation.find(match)
      .populate("organization", "name")
      .sort({ date: 1 })
      .lean();

    // ── 5. Build ledger with running balance (INR) ──────────────────────────
    let runningTotal = 0;
    const ledger = donations.map((d, idx) => {
      runningTotal += d.inrAmount;
      return {
        slNo: idx + 1,
        date: d.date,
        organization: d.organization?.name || "—",
        purpose: d.purpose || "",
        currency: d.currency,
        amount: d.amount,
        inrAmount: d.inrAmount,
        modeOfTransfer: d.modeOfTransfer,
        remarks: d.remarks || "",
        runningTotal,
      };
    });

    // ── 6. Summary ──────────────────────────────────────────────────────────
    // Group totals by currency
    const currencyTotals = {};
    donations.forEach((d) => {
      if (!currencyTotals[d.currency]) currencyTotals[d.currency] = 0;
      currencyTotals[d.currency] += d.amount;
    });

    const summary = {
      priest: priestDoc,
      totalDonations: donations.length,
      totalINR: runningTotal,
      currencyTotals,
    };

    res.json({ priests, ledger, summary });
  } catch (err) {
    console.error("Priest ledger error:", err);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;