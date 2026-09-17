// personMovementRoutes.js (Backend Routes)
const express = require('express');
const router = express.Router();
const PersonMovement = require('../models/PersonMovement');

// Get all person movements
router.get('/person-movements', async (req, res) => {
  try {
    const movements = await PersonMovement.find()
      .sort({ movedDate: -1 });
    res.json(movements);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get movements for a specific person
router.get('/person-movements/:personId', async (req, res) => {
  try {
    const movements = await PersonMovement.find({ person: req.params.personId })
      .sort({ movedDate: -1 });
    res.json(movements);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create new movement record
router.post('/person-movements', async (req, res) => {
  const movement = new PersonMovement(req.body);
  try {
    const newMovement = await movement.save();
    res.status(201).json(newMovement);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update movement record
router.put('/person-movements/:id', async (req, res) => {
  try {
    const movement = await PersonMovement.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    res.json(movement);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;