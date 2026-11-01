const mongoose = require('mongoose');

const roadReportSchema = new mongoose.Schema(
  {
    reportId: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    description: { type: String, default: '' },
    hazardType: {
      type: String,
      enum: [
        'FLOODED_ROAD',
        'DEBRIS_BLOCKED',
        'FIRE_BOUNDARY',
        'BRIDGE_COLLAPSE',
        'FALLEN_TREE',
        'LANDSLIDE_BLOCK',
        'ROAD_DAMAGE',
        'OTHER'
      ],
      default: 'FLOODED_ROAD'
    },
    severity: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
      default: 'HIGH'
    },
    location: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
      address: { type: String, default: 'Reported Road Location' }
    },
    geoPoint: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: {
        type: [Number], // [longitude, latitude] GeoJSON
        required: true
      }
    },
    radiusMeters: { type: Number, default: 150 }, // avoidance buffer radius
    status: {
      type: String,
      enum: ['REPORTED', 'VERIFIED', 'REJECTED', 'CLEARED'],
      default: 'REPORTED'
    },
    reportedBy: {
      id: { type: String, default: 'anonymous' },
      name: { type: String, default: 'Citizen Reporter' },
      role: { type: String, default: 'Citizen' }
    },
    verifiedBy: {
      id: { type: String, default: null },
      name: { type: String, default: null },
      verifiedAt: { type: Date, default: null }
    },
    notes: { type: String, default: '' }
  },
  { timestamps: true }
);

roadReportSchema.index({ geoPoint: '2dsphere' });
roadReportSchema.index({ status: 1 });

module.exports = mongoose.model('RoadReport', roadReportSchema);
