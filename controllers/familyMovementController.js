const FamilyMovement = require('../models/FamilyMovement');

exports.createMovement = async (req, res) => {
  try {
    const movement = new FamilyMovement(req.body);
    await movement.save();
    res.status(201).json(movement);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.getMovements = async (req, res) => {
  try {
    const movements = await FamilyMovement.find()
      .sort({ movedDate: -1 });
    res.json(movements);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};