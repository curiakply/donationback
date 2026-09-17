const mongoose = require('mongoose');

// Create a Mongoose schema for parish data
const parishDataSchema = new mongoose.Schema({
  name: String,
  collection: Number,
  prelim: Number,
  prop: Number,
  total: Number,
});

// Create a Mongoose model for parish data
const ParishData = mongoose.model('ParishData', parishDataSchema);

module.exports = ParishData;