const mongoose = require('mongoose');

const familyMovementSchema = new mongoose.Schema({

  
  family: {
    type: String, 
    required: true
  },
  familyName: {
    type: String,
    required: true
  },
  familyNumber: {
    type: Number,
    required: true
  },
  oldFamilyNumber: {  
    type: Number,
    required: true
  },
  newFamilyNumber: {   
    type: Number,
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
  destinationParish: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Parish',
    required: true
  },
  destinationParishName: {
    type: String,
    required: true
  },
  destinationKoottayma: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Koottayma',
    required: true
  },
  destinationKoottaymaName: {
    type: String,
    required: true
  },
  movedDate: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'cancelled'],
    default: 'completed'
  },
  remarks: {
    type: String
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('FamilyMovement', familyMovementSchema);