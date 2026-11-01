const mongoose = require('mongoose');

const reliefCampSchema = new mongoose.Schema(
  {
    campId: { type: String, unique: true, sparse: true },
    name: { type: String, required: true },
    location: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
      address: { type: String, default: 'Central Stadium Grounds' }
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
    capacity: { type: Number, default: 500 },
    currentOccupants: { type: Number, default: 210 },
    status: {
      type: String,
      enum: ['OPEN', 'NEAR_CAPACITY', 'FULL', 'CLOSED'],
      default: 'OPEN'
    },
    demographics: {
      children: { type: Number, default: 45 },
      women: { type: Number, default: 95 },
      seniorCitizens: { type: Number, default: 35 },
      men: { type: Number, default: 35 }
    },
    supplies: {
      foodPacks: { type: Number, default: 1200 },
      waterLiters: { type: Number, default: 4500 },
      medicineKits: { type: Number, default: 300 },
      blankets: { type: Number, default: 600 }
    },
    managerName: { type: String, default: 'Officer R. Sharma' },
    contactPhone: { type: String, default: '+1 (555) 789-0123' },
    verified: { type: Boolean, default: true }
  },
  { timestamps: true }
);

reliefCampSchema.index({ geoPoint: '2dsphere' });

module.exports = mongoose.model('ReliefCamp', reliefCampSchema);
