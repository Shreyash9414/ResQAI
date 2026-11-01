const mongoose = require('mongoose');

const sosSchema = new mongoose.Schema({
  citizenId: { type: String, default: '' },
  citizenName: { type: String, default: 'Anonymous Citizen' },
  citizenPhone: { type: String, default: '+1 (555) 911-0000' },
  location: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    address: { type: String, default: 'Emergency GPS Location' }
  },
  status: { type: String, enum: ['ACTIVE', 'ACKNOWLEDGED', 'RESOLVED'], default: 'ACTIVE' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('SOS', sosSchema);
