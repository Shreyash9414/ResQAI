const mongoose = require('mongoose');

const disasterSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    disasterType: {
      type: String,
      enum: [
        'FIRE', 'FLOOD', 'EARTHQUAKE', 'CYCLONE', 'LANDSLIDE', 'INDUSTRIAL_ACCIDENT', 'ACCIDENT', 'MEDICAL_EMERGENCY', 'OTHER',
        'Fire', 'Flood', 'Earthquake', 'Cyclone', 'Landslide', 'Accident', 'Medical Emergency', 'Building Collapse', 'Tsunami', 'Other'
      ],
      required: true
    },
    severity: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL', 'Low', 'Medium', 'High', 'Critical'],
      default: 'HIGH'
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'REPORTED', 'VERIFIED', 'DISPATCHED', 'IN_PROGRESS', 'CONTAINED', 'RESOLVED', 'Active', 'Reported', 'Verified', 'In Progress', 'Resolved'],
      default: 'ACTIVE'
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
        required: true
      },
      coordinates: {
        type: [Number], // [longitude, latitude] GeoJSON 2dsphere
        required: true
      },
      lat: { type: Number },
      lng: { type: Number },
      address: { type: String, default: 'Disaster Hazard Zone' }
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
    description: { type: String, default: '' },
    affectedCount: { type: Number, default: 0 },
    reportedBy: { type: String, default: 'Anonymous' },
    assignedTeams: [{ type: String }]
  },
  { timestamps: true }
);

disasterSchema.index({ location: '2dsphere' });
disasterSchema.index({ 'location.coordinates': '2dsphere' });
disasterSchema.index({ geoPoint: '2dsphere' });

module.exports = mongoose.models.Disaster || mongoose.model('Disaster', disasterSchema);
