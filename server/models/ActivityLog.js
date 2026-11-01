const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
  incidentId: { type: String, required: true },
  action: { type: String, required: true }, // e.g., REPORT_SUBMITTED, INCIDENT_VERIFIED, RESCUE_ASSIGNED, MISSION_ACCEPTED, RESCUE_STARTED, INCIDENT_RESOLVED
  performedBy: {
    userId: String,
    name: String,
    role: String
  },
  details: { type: String, default: '' },
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ActivityLog', activityLogSchema);
