const mongoose = require('mongoose');

const disasterAlertSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    citizenName: { type: String, default: 'Valued Citizen' },
    citizenEmail: { type: String, default: '' },

    disasterId: { type: String, required: true, index: true },
    disasterType: { type: String, default: 'FIRE' },
    disasterTitle: { type: String, default: 'Emergency Hazard' },
    severity: { type: String, default: 'HIGH' },

    distanceMeters: { type: Number, required: true },

    citizenLocation: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        default: [77.2051, 28.6284]
      }
    },
    citizenLatitude: { type: Number },
    citizenLongitude: { type: Number },

    gpsAccuracy: { type: Number, required: true },

    emailSent: { type: Boolean, default: true },
    emailSentAt: { type: Date, default: Date.now },

    emailStatus: {
      type: String,
      enum: ['PENDING', 'SENT', 'FAILED', 'DISABLED', 'SKIPPED_DUPLICATE'],
      default: 'SENT'
    },

    warningStatus: {
      type: String,
      enum: ['ACTIVE', 'RESOLVED', 'ENTERED', 'EXITED'],
      default: 'ACTIVE'
    },

    status: {
      type: String,
      enum: ['ENTERED', 'ACTIVE', 'EXITED'],
      default: 'ENTERED'
    },

    detectedAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

disasterAlertSchema.index({ citizenLocation: '2dsphere' });
disasterAlertSchema.index({ userId: 1, disasterId: 1, warningStatus: 1 });
disasterAlertSchema.index({ userId: 1, disasterId: 1, status: 1 });

module.exports = mongoose.models.DisasterAlert || mongoose.model('DisasterAlert', disasterAlertSchema);
