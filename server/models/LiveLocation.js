const mongoose = require('mongoose');

const liveLocationSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true },
    userRole: { type: String, default: 'citizen' },
    name: { type: String, default: 'User' },
    location: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
      address: { type: String, default: '' }
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
    speed: { type: Number, default: 0 },
    heading: { type: Number, default: 0 },
    accuracy: { type: Number, default: 10 },
    isSharing: { type: Boolean, default: true },
    lastUpdated: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

liveLocationSchema.index({ geoPoint: '2dsphere' });

module.exports = mongoose.models.LiveLocation || mongoose.model('LiveLocation', liveLocationSchema);
