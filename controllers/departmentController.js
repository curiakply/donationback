const Department = require("../models/Department");

async function getAllDepartments(req, res) {
  try {
    const departments = await Department.find().select("_id name category subcategory createdAt");
    res.status(200).json(departments);
  } catch (err) {
    res.status(500).json({ message: "An error occurred while fetching departments." });
  }
}

async function getOneDepartment(req, res) {
  try {
    const department = await Department.findById(req.params.departmentid);
    if (!department) return res.status(404).json({ message: "Department not found." });
    res.status(200).json(department);
  } catch (err) {
    res.status(500).json({ message: "An error occurred while fetching department." });
  }
}

async function createNewDepartment(req, res) {
  try {
    const { name, category, subcategory } = req.body;
    if (!name || !category || !subcategory)
      return res.status(400).json({ message: "All fields are required." });
    const department = await new Department({ name: name.trim(), category, subcategory }).save();
    res.status(201).json({ message: "Department created successfully.", department });
  } catch (err) {
    res.status(500).json({ message: "An error occurred while creating department." });
  }
}

async function updateDepartment(req, res) {
  try {
    const { name, category, subcategory } = req.body;
    const department = await Department.findByIdAndUpdate(
      req.params.departmentid,
      { name: name?.trim(), category, subcategory },
      { new: true }
    );
    if (!department) return res.status(404).json({ message: "Department not found." });
    res.status(200).json({ message: "Department updated successfully." });
  } catch (err) {
    res.status(500).json({ message: "An error occurred while updating department." });
  }
}

async function deleteDepartment(req, res) {
  try {
    const department = await Department.findByIdAndDelete(req.params.departmentid);
    if (!department) return res.status(404).json({ message: "Department not found." });
    res.status(200).json({ message: "Department deleted successfully." });
  } catch (err) {
    res.status(500).json({ message: "An error occurred while deleting department." });
  }
}

module.exports = { getAllDepartments, getOneDepartment, createNewDepartment, updateDepartment, deleteDepartment };