const mongoose = require('mongoose');

const ResourceAllocationSchema = new mongoose.Schema(
  {
    allocationId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    requestId: {
      type: String,
      default: null
    },
    resourceId: {
      type: String,
      required: true,
      index: true
    },
    resourceName: {
      type: String,
      required: true
    },
    category: {
      type: String,
      default: 'General'
    },
    incidentId: {
      type: String,
      required: true,
      index: true
    },
    disasterTitle: {
      type: String,
      default: 'Disaster Site'
    },
    assignedTeamId: {
      type: String,
      default: null
    },
    assignedTeamName: {
      type: String,
      default: null
    },
    quantityAllocated: {
      type: Number,
      required: true,
      min: [1, 'Allocated quantity must be at least 1']
    },
    priority: {
      type: String,
      enum: ['Critical', 'High', 'Medium', 'Low'],
      default: 'High'
    },
    status: {
      type: String,
      enum: ['Requested', 'Approved', 'Allocated', 'Dispatched', 'Deployed', 'Delivered', 'Returned', 'Consumed'],
      default: 'Allocated',
      index: true
    },
    allocatedBy: {
      type: String,
      default: 'Emergency Operator'
    },
    allocatedByRole: {
      type: String,
      default: 'Operator'
    },
    destination: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
      address: { type: String, default: 'Deployment Site' }
    },
    etaMinutes: {
      type: Number,
      default: 15
    },
    allocatedAt: {
      type: Date,
      default: Date.now
    },
    returnedAt: {
      type: Date,
      default: null
    },
    notes: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.models.ResourceAllocation || mongoose.model('ResourceAllocation', ResourceAllocationSchema);
