const mongoose = require('mongoose');

const emergencyAlertSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  incidentId: { type: String, required: true, index: true },
  disasterType: { type: String, default: 'FIRE' },
  severity: { type: String, default: 'CRITICAL' },
  distanceMeters: { type: Number, required: true },
  radiusMeters: { type: Number, default: 100 },
  status: {
    type: String,
    enum: ['ENTERED', 'INSIDE', 'LEFT_RADIUS', 'ACKNOWLEDGED'],
    default: 'ENTERED'
  },
  sentAt: { type: Date, default: Date.now },
  acknowledgedAt: { type: Date }
});

emergencyAlertSchema.index({ userId: 1, incidentId: 1 });

module.exports = mongoose.model('EmergencyAlert', emergencyAlertSchema);
