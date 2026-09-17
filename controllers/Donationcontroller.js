const Donation = require("../models/Donation");
const Organization = require("../models/Organization");
const Priest = require("../models/Priest");
const Narration = require("../models/Narration");

// ─── Organizations ────────────────────────────────────────────────────────

exports.getAllOrganizations = async (req, res) => {
  try {
    const orgs = await Organization.find({ isActive: true }).sort({ name: 1 });
    res.status(200).json({ success: true, data: orgs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.createOrganization = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ success: false, message: "Organization name is required" });

    const existing = await Organization.findOne({ name: { $regex: new RegExp(`^${name.trim()}$`, 'i') } });
    if (existing) return res.status(200).json({ success: true, data: existing, message: "Organization already exists" });

    const org = await Organization.create({ ...req.body, name: name.trim() });
    res.status(201).json({ success: true, data: org });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateOrganization = async (req, res) => {
  try {
    const org = await Organization.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!org) return res.status(404).json({ success: false, message: "Organization not found" });
    res.status(200).json({ success: true, data: org });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.deleteOrganization = async (req, res) => {
  try {
    const org = await Organization.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!org) return res.status(404).json({ success: false, message: "Organization not found" });
    res.status(200).json({ success: true, message: "Organization deactivated" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Donations ────────────────────────────────────────────────────────────

exports.getAllDonations = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const [donations, total] = await Promise.all([
      Donation.find()
        .populate("organization", "name")
        .populate("priest", "name hname")
        .sort({ date: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Donation.countDocuments(),
    ]);

    res.status(200).json({ success: true, data: donations, total, page, limit });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.createDonation = async (req, res) => {
  try {
    const { organization, organizationName, purpose, currency, amount, modeOfTransfer } = req.body;

    // inrAmount is now optional
    if (!purpose || !currency || !amount || !modeOfTransfer) {
      return res.status(400).json({ success: false, message: "Purpose, currency, amount, and mode of transfer are required" });
    }

    let orgId = organization;

    // If "other" selected — auto-create organization
    if (organization === "other" && organizationName) {
      let existingOrg = await Organization.findOne({
        name: { $regex: new RegExp(`^${organizationName.trim()}$`, 'i') },
      });
      if (!existingOrg) {
        existingOrg = await Organization.create({ name: organizationName.trim() });
      }
      orgId = existingOrg._id;
    }

    if (!orgId || orgId === "other") {
      return res.status(400).json({ success: false, message: "Organization is required" });
    }

    const donationData = {
      priest: req.body.priest,
      organization: orgId,
      purpose,
      currency,
      amount,
      modeOfTransfer,
      date: req.body.date || Date.now(),
      remarks: req.body.remarks || "",
    };

    // inrAmount only if provided
    if (req.body.inrAmount) {
      donationData.inrAmount = req.body.inrAmount;
    }

    // Store narration ref if provided
    if (req.body.narration) {
      donationData.narration = req.body.narration;
    }

    const donation = await Donation.create(donationData);

    const populated = await Donation.findById(donation._id)
      .populate("organization", "name")
      .populate("priest", "name hname");

    res.status(201).json({ success: true, data: populated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateDonation = async (req, res) => {
  try {
    const donation = await Donation.findByIdAndUpdate(req.params.id, req.body, { new: true })
      .populate("organization", "name")
      .populate("priest", "name hname");
    if (!donation) return res.status(404).json({ success: false, message: "Donation not found" });
    res.status(200).json({ success: true, data: donation });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.deleteDonation = async (req, res) => {
  try {
    const donation = await Donation.findByIdAndDelete(req.params.id);
    if (!donation) return res.status(404).json({ success: false, message: "Donation not found" });
    res.status(200).json({ success: true, message: "Donation deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getDonationSummary = async (req, res) => {
  try {
    const summary = await Donation.aggregate([
      {
        $group: {
          _id: "$currency",
          totalAmount: { $sum: "$amount" },
          totalINR: { $sum: { $ifNull: ["$inrAmount", 0] } },
          count: { $sum: 1 },
        },
      },
      { $sort: { totalINR: -1 } },
    ]);

    const grandTotalINR = summary.reduce((sum, s) => sum + s.totalINR, 0);
    const totalDonations = summary.reduce((sum, s) => sum + s.count, 0);

    res.status(200).json({
      success: true,
      data: { byCurrency: summary, grandTotalINR, totalDonations },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};