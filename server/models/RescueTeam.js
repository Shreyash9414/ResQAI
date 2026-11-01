const mongoose = require('mongoose');

const rescueTeamSchema = new mongoose.Schema(
  {
    vehicleId: { type: String, unique: true },
    name: { type: String, required: true },
    teamLeader: { type: String, default: '' },
    type: {
      type: String,
      enum: ['AMBULANCE', 'FIRE_BRIGADE', 'POLICE', 'RESCUE_TEAM', 'Ambulance', 'Fire Truck', 'Police Cruiser', 'Drone Unit'],
      required: true
    },
    status: {
      type: String,
      enum: ['AVAILABLE', 'ASSIGNED', 'DISPATCHED', 'EN_ROUTE', 'ARRIVED', 'BUSY', 'OFFLINE', 'Available', 'Dispatched', 'En Route'],
      default: 'AVAILABLE'
    },
    membersCount: { type: Number, default: 4 },
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
      lat: { type: Number },
      lng: { type: Number },
      address: { type: String, default: 'Base Rescue Station' }
    },
    gpsAccuracy: { type: Number, default: 8 },
    speed: { type: Number, default: 0 },
    heading: { type: Number, default: 0 },
    contactNumber: { type: String, default: '+919876543210' },
    capabilities: [{ type: String }],
    locationSource: {
      type: String,
      enum: ['LIVE_GPS', 'LAST_REPORTED', 'MANUAL_RECORDED'],
      default: 'LIVE_GPS'
    },
    currentIncidentId: { type: String, default: null },
    lastLocationUpdate: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

rescueTeamSchema.index({ location: '2dsphere' });

module.exports = mongoose.models.RescueTeam || mongoose.model('RescueTeam', rescueTeamSchema);

