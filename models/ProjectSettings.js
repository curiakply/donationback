const mongoose = require('mongoose');

const projectSettingsSchema = new mongoose.Schema({
  project_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true
  },
  project_name: {
    type: String,
    required: true
  },
  percentage: {
    type: Number,
    required: true,
    min: 0,
    max: 100,
    default: 0
  },
  allocated_amount: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  year: {
    type: Number,
    required: true,
    default: new Date().getFullYear()
  }
}, {
  timestamps: true
});

projectSettingsSchema.index({ project_id: 1, year: 1 }, { unique: true });

const ProjectSettings = mongoose.model('ProjectSettings', projectSettingsSchema);
module.exports = ProjectSettings;