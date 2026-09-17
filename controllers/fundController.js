const Funds = require("../models/Funds");

async function getAllFunds(req, res) {
    try {
        const funds = await Funds.find();
        if (!funds) {
            res.status(404).json({ message: "No funds found." });
        } else {
            res.status(200).json(funds);
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "An error occurred while fetching funds." });
    }
}

async function getOneFund(req, res) {
    try {
        const fund = await Funds.findById(req.params.fundId);
        if (!fund) {
            res.status(404).json({ message: "Fund not found." });
        } else {
            res.status(200).json(fund);
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "An error occurred while fetching fund data." });
    }
}

async function createNewFund(req, res) {
    try {
        const fund = new Funds(req.body);
        await fund.save();
        res.status(201).json({ message: "Fund created successfully." });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "An error occurred while creating fund." });
    }
}

async function updateFund(req, res) {
    try {
        const fund = await Funds.findByIdAndUpdate(req.params.fundId, req.body, { new: true, runValidators: true });
        if (!fund) {
            res.status(404).json({ message: "Fund not found." });
        } else {
            res.status(200).json({ message: "Fund updated successfully.", fund });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "An error occurred while updating fund." });
    }
}

async function deleteFund(req, res) {
    try {
        const fund = await Funds.findByIdAndDelete(req.params.fundId);
        if (!fund) {
            res.status(404).json({ message: "Fund not found." });
        } else {
            res.status(200).json({ message: "Fund deleted successfully." });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "An error occurred while deleting fund." });
    }
}

module.exports = {
    getAllFunds,
    getOneFund,
    createNewFund,
    updateFund,
    deleteFund,
};