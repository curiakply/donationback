const Slab = require('../models/Slab');
const mongoose = require('mongoose');

const SlabController = {
  getSlabs: async (req, res) => { 
    try {
      const { year } = req.params;
      const slabs = await Slab.find({ year: parseInt(year) }).sort({ minValue: 1 });
      res.json(slabs);
    } catch (error) {
      console.error('Error getting slabs:', error);
      res.status(500).json({ message: error.message });
    }
  },

  saveSlabs: async (req, res) => {
    try {
      const { slabs, year } = req.body;

      if (!slabs || !Array.isArray(slabs) || slabs.length === 0) {
        throw new Error('Invalid slabs data');
      }

      const formattedSlabs = slabs.map(slab => ({
        minValue: Number(slab.minValue),
        maxValue: Number(slab.maxValue),
        year
      }));

      // First, delete existing slabs for the year
      await Slab.deleteMany({ year });

      // Then insert the new slabs
      const savedSlabs = await Slab.insertMany(formattedSlabs);
      
      res.status(201).json(savedSlabs);
      
    } catch (error) {
      console.error('Error saving slabs:', error);
      res.status(400).json({ message: error.message });
    }
  }
};

module.exports = SlabController;