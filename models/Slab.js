const mongoose = require('mongoose');

const SlabSchema = new mongoose.Schema({
  minValue: {
    type: Number,
    required: true
  },
  maxValue: {
    type: Number,
    required: true
  },
  year: {
    type: Number,
    required: true
  }
}, {
  timestamps: true
});

// Ensure each slab range is unique for a year
SlabSchema.index({ year: 1, minValue: 1, maxValue: 1 }, { unique: true });

const Slab = mongoose.model('Slab', SlabSchema);
module.exports = Slab;