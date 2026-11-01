const mongoose = require('mongoose');

const sosRequestSchema = new mongoose.Schema(
  {
    sosId: { type: String, unique: true, sparse: true },
    incidentId: { type: String, default: null },
    clientRequestId: { type: String, index: true },
    citizenId: { type: String, default: '' },
    citizenName: { type: String, required: true, default: 'Anonymous Citizen' },
    citizenPhone: { type: String, default: '' },
    location: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
      address: { type: String, default: 'Emergency GPS Location' }
    },
    geoPoint: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: {
        type: [Number] // [lng, lat]
      }
    },
    locationType: {
      type: String,
      enum: ['GPS_VERIFIED', 'MANUAL_ENTRY'],
      default: 'GPS_VERIFIED'
    },
    locationAccuracy: { type: Number, default: 5 },
    locationAcquisitionTime: { type: Date, default: Date.now },
    requestedServices: [{ type: String }],
    emergencyType: { type: String, default: 'General Emergency' },
    severity: { type: String, enum: ['Low', 'Medium', 'High', 'Critical'], default: 'Critical' },
    status: {
      type: String,
      enum: [
        'SOS Submitted',
        'Awaiting Review',
        'Verified',
        'Awaiting Assignment',
        'Responder Assigned',
        'Responder En Route',
        'Assistance Arrived',
        'Resolved',
        'Cancelled',
        'ACTIVE',
        'ACKNOWLEDGED',
        'RESOLVED',
        'PENDING',
        'CANCELLED'
      ],
      default: 'SOS Submitted'
    },
    description: { type: String, default: '' },
    assignedTeamId: { type: String, default: null },
    assignedResponders: [{
      id: String,
      name: String,
      type: String,
      location: { lat: Number, lng: Number },
      distanceKm: String,
      assignedAt: { type: Date, default: Date.now }
    }],
    statusHistory: [{
      status: { type: String },
      changedBy: { type: String, default: 'System' },
      timestamp: { type: Date, default: Date.now },
      notes: { type: String, default: '' }
    }],
    notificationStatus: {
      smsSent: { type: Boolean, default: false },
      emailSent: { type: Boolean, default: false },
      broadcastSent: { type: Boolean, default: false },
      deliveryNotes: { type: String, default: '' }
    },
    createdAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

sosRequestSchema.index({ geoPoint: '2dsphere' });

module.exports = mongoose.models.SOSRequest || mongoose.model('SOSRequest', sosRequestSchema);
