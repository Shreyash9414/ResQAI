const mongoose = require('mongoose');

const safetyAlertLogSchema = new mongoose.Schema(
  {
    citizenId: { type: String, required: true },
    citizenName: { type: String, default: 'Citizen' },
    recipientEmail: { type: String, required: true },
    disasterId: { type: String, required: true },
    disasterTitle: { type: String, default: 'Active Hazard' },
    disasterType: { type: String, required: true, uppercase: true },
    riskLevel: {
      type: String,
      enum: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'UNCERTAIN'],
      required: true
    },
    distanceKm: { type: Number, required: true },
    distanceMeters: { type: Number, required: true },
    operatorId: { type: String, default: 'usr_operator' },
    operatorName: { type: String, default: 'Emergency Operator' },
    sentAt: { type: Date, default: Date.now },
    status: {
      type: String,
      enum: ['Sent', 'Delivered', 'Failed'],
      default: 'Sent'
    },
    errorDetails: { type: String, default: null },
    precautionsIncluded: [{ type: String }]
  },
  { timestamps: true }
);

safetyAlertLogSchema.index({ citizenId: 1, disasterId: 1 });
safetyAlertLogSchema.index({ recipientEmail: 1 });
safetyAlertLogSchema.index({ sentAt: -1 });

module.exports = mongoose.models.SafetyAlertLog || mongoose.model('SafetyAlertLog', safetyAlertLogSchema);
