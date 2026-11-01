const mongoose = require('mongoose');

const incidentSchema = new mongoose.Schema(
  {
    incidentId: { type: String, unique: true },
    citizenId: { type: String, default: 'usr_1' },
    title: { type: String, required: true },
    disasterType: {
      type: String,
      enum: ['Fire', 'FIRE', 'Flood', 'FLOOD', 'Earthquake', 'EARTHQUAKE', 'Cyclone', 'Landslide', 'Accident', 'ACCIDENT', 'Medical Emergency', 'MEDICAL', 'Medical', 'Building Collapse', 'Tsunami', 'Other', 'SOS'],
      required: true
    },
    severity: {
      type: String,
      enum: ['Low', 'Medium', 'High', 'Critical', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
      default: 'CRITICAL'
    },
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
        'REPORT_SUBMITTED',
        'REPORT_VERIFIED',
        'SEARCHING_FOR_RESCUE',
        'RESCUE_ASSIGNED',
        'MISSION_ACCEPTED',
        'RESCUE_ON_WAY',
        'RESCUE_ARRIVED',
        'OPERATION_IN_PROGRESS',
        'INCIDENT_RESOLVED',
        'REPORTED',
        'VERIFIED',
        'DISPATCHED',
        'EN_ROUTE',
        'ARRIVED',
        'RESOLVED',
        'REJECTED',
        'RESOURCE_ASSIGNED',
        'AMBULANCE_DISPATCHED',
        'CANCELLED',
        'Pending',
        'Verified',
        'Assigned',
        'In Progress',
        'Resolved',
        'Rejected'
      ],
      default: 'SOS Submitted'
    },
    sosId: { type: String, sparse: true, index: true },
    requestedServices: [{ type: String }],
    reporterName: { type: String, default: 'Anonymous Citizen' },
    reporterPhone: { type: String, default: '' },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: {
        type: [Number], // [longitude, latitude] GeoJSON
        required: true
      },
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
      address: { type: String, default: 'Incident GPS Location' }
    },
    locationType: {
      type: String,
      enum: ['GPS_VERIFIED', 'MANUAL_ENTRY'],
      default: 'GPS_VERIFIED'
    },
    locationAccuracy: { type: Number, default: 8 },
    locationAcquisitionTime: { type: Date, default: Date.now },
    locationUpdatedAt: { type: Date, default: Date.now },
    description: { type: String, default: '' },
    assignedVehicleId: { type: String, default: null },
    assignedVehicleType: { type: String, default: null },
    assignedAt: { type: Date },
    distanceToIncident: { type: String, default: null },
    assignedResponders: [{
      id: String,
      name: String,
      type: String, // AMBULANCE, FIRE_BRIGADE, POLICE, RESCUE_TEAM
      location: {
        lat: Number,
        lng: Number
      },
      distanceKm: String,
      assignedAt: { type: Date, default: Date.now }
    }],
    assignedUnits: [{
      unitId: String,
      unitName: String,
      type: String,
      status: String,
      location: { lat: Number, lng: Number },
      distanceKm: String,
      lastUpdated: String
    }],
    timeline: [{
      step: String,
      label: String,
      timestamp: { type: String, default: () => new Date().toISOString() }
    }],
    statusHistory: [{
      status: { type: String },
      changedBy: { type: String, default: 'System' },
      timestamp: { type: Date, default: Date.now },
      notes: { type: String, default: '' }
    }],
    verifiedAt: Date,
    verifiedBy: String,
    arrivedAt: Date,
    resolvedAt: Date,
    resolvedBy: String,
    createdAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

incidentSchema.index({ 'location': '2dsphere' });
incidentSchema.index({ 'location.coordinates': '2dsphere' });

module.exports = mongoose.models.Incident || mongoose.model('Incident', incidentSchema);
