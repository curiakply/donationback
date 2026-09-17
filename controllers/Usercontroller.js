const Admin = require("../models/admin.model");
const bcrypt = require("bcrypt");

// GET all users (paginated)
exports.getAllUsers = async (req, res) => {
  try {
    const loggedIn = req.admin || req.user;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;
    const search = req.query.search || "";

    const filter = {};

    // Admin can only see their own account
    // Priority: auth middleware > query param userId
    if (loggedIn?.role === "admin") {
      filter._id = loggedIn._id;
    } else if (req.query.userId) {
      filter._id = req.query.userId;
    }

    if (req.query.role) filter.role = req.query.role;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
      ];
    }

    const [users, total] = await Promise.all([
      Admin.find(filter)
        .select("-password")
        .populate("createdBy", "name")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Admin.countDocuments(filter),
    ]);

    res.status(200).json({ success: true, data: users, total, page, limit });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET single user
exports.getUserById = async (req, res) => {
  try {
    const user = await Admin.findById(req.params.id).select("-password").lean();
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    res.status(200).json({ success: true, data: user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// CREATE user (superadmin only)
exports.createUser = async (req, res) => {
  try {
    const loggedIn = req.admin || req.user;
    if (loggedIn?.role !== "superadmin") {
      return res.status(403).json({ success: false, message: "Only superadmin can create users" });
    }

    const { name, email, phone, password } = req.body;

    if (!name || !email || !phone || !password) {
      return res.status(400).json({ success: false, message: "Name, email, phone, and password are required" });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, message: "Password must be at least 6 characters" });
    }

    const existing = await Admin.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return res.status(400).json({ success: false, message: "Email already exists" });
    }

    const role = req.body.role === "superadmin" ? "superadmin" : "admin";

    const user = await Admin.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      phone: phone.trim(),
      password,
      role,
      createdBy: req.admin?._id || null,
    });

    const result = user.toObject();
    delete result.password;

    res.status(201).json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// UPDATE user
exports.updateUser = async (req, res) => {
  try {
    const loggedIn = req.admin || req.user;
    const { name, email, phone, password, isActive, role } = req.body;
    const user = await Admin.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    // Admin can only edit their own account
    if (loggedIn?.role === "admin" && user._id.toString() !== loggedIn._id.toString()) {
      return res.status(403).json({ success: false, message: "You can only edit your own account" });
    }

    // Admin cannot change role or status
    if (loggedIn?.role === "admin") {
      delete req.body.role;
      delete req.body.isActive;
    }

    // Superadmin can edit any account

    // Check email uniqueness if changed
    if (email && email.toLowerCase().trim() !== user.email) {
      const dup = await Admin.findOne({ email: email.toLowerCase().trim() });
      if (dup) return res.status(400).json({ success: false, message: "Email already exists" });
      user.email = email.toLowerCase().trim();
    }

    if (name) user.name = name.trim();
    if (phone) user.phone = phone.trim();
    if (typeof isActive === "boolean") user.isActive = isActive;
    if (role && ["admin", "superadmin"].includes(role)) user.role = role;

    // Only update password if provided
    if (password && password.length >= 6) {
      user.password = password; // pre-save hook will hash
    } else if (password) {
      return res.status(400).json({ success: false, message: "Password must be at least 6 characters" });
    }

    await user.save();

    const result = user.toObject();
    delete result.password;

    res.status(200).json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE user (soft delete, superadmin only)
exports.deleteUser = async (req, res) => {
  try {
    const loggedIn = req.admin || req.user;
    if (loggedIn?.role !== "superadmin") {
      return res.status(403).json({ success: false, message: "Only superadmin can deactivate users" });
    }

    const user = await Admin.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    if (user.role === "superadmin") {
      return res.status(403).json({ success: false, message: "Superadmin accounts cannot be deactivated" });
    }

    user.isActive = false;
    await user.save();

    res.status(200).json({ success: true, message: "User deactivated" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// TOGGLE active status (superadmin only)
exports.toggleStatus = async (req, res) => {
  try {
    const loggedIn = req.admin || req.user;
    if (loggedIn?.role !== "superadmin") {
      return res.status(403).json({ success: false, message: "Only superadmin can toggle user status" });
    }

    const user = await Admin.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    if (user.role === "superadmin") {
      return res.status(403).json({ success: false, message: "Cannot toggle superadmin status" });
    }

    user.isActive = !user.isActive;
    await user.save();

    res.status(200).json({
      success: true,
      data: { isActive: user.isActive },
      message: user.isActive ? "User activated" : "User deactivated",
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// SUMMARY stats
exports.getUserSummary = async (req, res) => {
  try {
    const [total, active, inactive, admins, superadmins] = await Promise.all([
      Admin.countDocuments(),
      Admin.countDocuments({ isActive: true }),
      Admin.countDocuments({ isActive: false }),
      Admin.countDocuments({ role: "admin" }),
      Admin.countDocuments({ role: "superadmin" }),
    ]);

    res.status(200).json({
      success: true,
      data: { total, active, inactive, admins, superadmins },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};