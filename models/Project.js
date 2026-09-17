const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  _id: mongoose.Schema.Types.ObjectId,
  name: { type: String, required: true },
  percent: { type: Number, required: true },
  amountAllocated: { type: Number, required: true },
  fiscalYear: { type: Number, required: true }
});

const Project = mongoose.model('Project', projectSchema);