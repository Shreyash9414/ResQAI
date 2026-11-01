const mongoose = require('mongoose');

const weatherAlertSchema = new mongoose.Schema(
  {
    alertType: { type: String, required: true }, // Storm, Flood Warning, Heatwave, Tsunami
    severity: {
      type: String,
      enum: ['Info', 'Minor', 'Moderate', 'Severe', 'Extreme'],
      default: 'Moderate'
    },
    title: { type: String, required: true },
    description: { type: String, default: '' },
    region: { type: String, required: true },
    location: {
      lat: { type: Number },
      lng: { type: Number }
    },
    effectiveFrom: { type: Date, default: Date.now },
    expiresAt: { type: Date },
    source: { type: String, default: 'National Meteorological Department' },
    status: {
      type: String,
      enum: ['ACTIVE', 'EXPIRED', 'CANCELLED'],
      default: 'ACTIVE'
    }
  },
  { timestamps: true }
);

module.exports = mongoose.models.WeatherAlert || mongoose.model('WeatherAlert', weatherAlertSchema);
