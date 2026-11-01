const mongoose = require('mongoose');

const safetyPrecautionSchema = new mongoose.Schema(
  {
    disasterType: {
      type: String,
      required: true,
      unique: true,
      uppercase: true
    },
    title: { type: String, required: true },
    instructions: [{ type: String, required: true }],
    severity: {
      type: String,
      enum: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'],
      default: 'HIGH'
    },
    source: { type: String, default: 'National Disaster Management Authority (NDMA)' },
    emergencyHelplines: [
      {
        name: String,
        number: String
      }
    ],
    lastReviewed: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

module.exports = mongoose.models.SafetyPrecaution || mongoose.model('SafetyPrecaution', safetyPrecautionSchema);
