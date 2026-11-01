const mongoose = require('mongoose');

const ResourceSchema = new mongoose.Schema(
  {
    resourceId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    category: {
      type: String,
      required: true,
      index: true,
      enum: [
        'Emergency Vehicles',
        'Medical Supplies',
        'Essential Supplies',
        'Rescue Equipment',
        'Human Resources',
        'Custom'
      ]
    },
    customCategoryName: {
      type: String,
      default: ''
    },
    description: {
      type: String,
      default: ''
    },
    totalQuantity: {
      type: Number,
      required: true,
      min: [0, 'Total quantity cannot be negative']
    },
    availableQuantity: {
      type: Number,
      required: true,
      min: [0, 'Available quantity cannot be negative']
    },
    unit: {
      type: String,
      required: true,
      default: 'units'
    },
    location: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
      address: { type: String, default: 'Storage Depot' },
      storageDepot: { type: String, default: 'Central Rescue Hub' }
    },
    status: {
      type: String,
      enum: ['Available', 'Deployed', 'Maintenance', 'Low Stock', 'Out of Stock', 'Unavailable', 'Deactivated'],
      default: 'Available',
      index: true
    },
    department: {
      type: String,
      default: 'Disaster Management Authority'
    },
    minStockThreshold: {
      type: Number,
      default: 5,
      min: 0
    },
    expiryDate: {
      type: Date,
      default: null
    },
    notes: {
      type: String,
      default: ''
    },
    assignedIncidentId: {
      type: String,
      default: null
    },
    assignedDisasterTitle: {
      type: String,
      default: null
    },
    assignedTeamId: {
      type: String,
      default: null
    },
    assignedTeamName: {
      type: String,
      default: null
    },
    isVehicleOrEquipment: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

ResourceSchema.index({ 'location.lat': 1, 'location.lng': 1 });

module.exports = mongoose.models.Resource || mongoose.model('Resource', ResourceSchema);
