// PersonMovement.js (Backend Schema)
const mongoose = require('mongoose');

const personMovementSchema = new mongoose.Schema({
  person: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Person',
    required: true
  },
  personName: {
    type: String,
    required: true
  },
  // Source details
  sourceFamily: {
    type: String,
    ref: 'Family',
    required: true
  },
  sourceFamilyName: {
    type: String,
    required: true
  },
  sourceParish: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Parish',
    required: true
  },
  sourceParishName: {
    type: String,
    required: true
  },
  sourceKoottayma: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Koottayma',
    required: true
  },
  sourceKoottaymaName: {
    type: String,
    required: true
  },
  // Destination details
  destinationFamily: {
    type: String,
    ref: 'Family'
  },
  destinationFamilyName: {
    type: String,
    required: true
  },
  destinationParish: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Parish'
  },
  destinationParishName: {
    type: String,
    required: true
  },
  destinationKoottayma: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Koottayma'
  },
  destinationKoottaymaName: {
    type: String,
    required: true
  },
  oldRelation: {
    type: String,
    required: true
  },
  newRelation: {
    type: String,
    required: true
  },
  movedDate: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['completed', 'moved_out', 'pending','deceased','active'],
    default: 'completed'
  },
  remarks: {
    type: String
  }
});

module.exports = mongoose.model('PersonMovement', personMovementSchema);