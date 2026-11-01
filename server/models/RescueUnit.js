const mongoose = require('mongoose');

const rescueUnitSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: {
    type: String,
    enum: ['AMBULANCE', 'FIRE_BRIGADE', 'POLICE', 'Ambulance', 'Fire Truck', 'Police Cruiser'],
    required: true
  },
  status: {
    type: String,
    enum: ['AVAILABLE', 'DISPATCHED', 'EN_ROUTE', 'ARRIVED', 'COMPLETED', 'OFFLINE', 'Available', 'Dispatched', 'En Route', 'Busy'],
    default: 'AVAILABLE'
  },
  location: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    address: { type: String, default: 'Base Rescue Station' }
  },
  geoPoint: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true
    }
  },
  locationAccuracy: { type: Number, default: 8 },
  locationUpdatedAt: { type: Date, default: Date.now },
  assignedIncident: { type: String, default: null },
  contactNumber: { type: String, default: '+919876543210' }
});

rescueUnitSchema.index({ geoPoint: '2dsphere' });

module.exports = mongoose.model('RescueUnit', rescueUnitSchema);
