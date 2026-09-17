const AllocationSettings = require("../models/AllocationSettings");

async function getAllocationSetting(req, res) {
  try {
    const year = req.query.year ? req.query.year : new Date().getFullYear();
    const allocationSettings = await AllocationSettings.findOne({
      year,
    }).exec();
    if (allocationSettings) {
      res.status(200).json(allocationSettings);
    } else {
      res.status(404).json({
        message: `Allocation settings not found for the year ${year}.`,
      });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({
      message: "An error occured while fetching Allocation settings.",
    });
  }
}

async function createNewAllocationSetting(req, res) {
  try {
    const allocationSetting = await AllocationSettings.findOne({
      year: req.body.year,
    }).exec();
    if (!allocationSetting) {
      const newAllocation = new AllocationSettings(req.body);
      res.status(201).json({
        message: `Allocation settings saved for the year ${req.body.year} successfully.`,
      });
    } else {
      return res.status(409).json({
        message: `An Allocation for the year ${req.body.year} already exists.`,
      });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({
      message: "An error occurred while creating a new Allocation Setting.",
    });
  }
}

async function updateAllocationSetting(req, res) {
  try {
    const allocationSetting = await AllocationSettings.findByIdAndUpdate(
      req.params.allocationSettingsId,
      req.body,
      { new: true, runValidators: true }
    ).exec();
    if (allocationSetting) {
      res.status(200).json({
        message: `Allocation settings updated successfully.`,
        allocationSetting,
      });
    } else {
      res.status(404).json({
        message: `Allocation settings not found with id ${req.params.id}.`,
      });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({
      message: "An error occurred while updating Allocation settings.",
    });
  }
}

module.exports = {
  getAllocationSetting,
  createNewAllocationSetting,
  updateAllocationSetting,
};
