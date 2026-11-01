const mongoose = require('mongoose');

const ResourceRequestSchema = new mongoose.Schema(
  {
    requestId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    requestingTeamId: {
      type: String,
      required: true
    },
    requestingTeamName: {
      type: String,
      required: true
    },
    requestingDepartment: {
      type: String,
      default: 'Field Rescue Operations'
    },
    incidentId: {
      type: String,
      required: true,
      index: true
    },
    incidentTitle: {
      type: String,
      default: 'Emergency Incident'
    },
    resourceId: {
      type: String,
      required: true
    },
    resourceName: {
      type: String,
      required: true
    },
    category: {
      type: String,
      required: true
    },
    quantityRequested: {
      type: Number,
      required: true,
      min: [1, 'Requested quantity must be at least 1']
    },
    quantityAllocated: {
      type: Number,
      default: 0,
      min: 0
    },
    priority: {
      type: String,
      enum: ['Critical', 'High', 'Medium', 'Low'],
      default: 'High',
      index: true
    },
    requestReason: {
      type: String,
      required: true
    },
    destination: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
      address: { type: String, default: 'Incident Location' }
    },
    status: {
      type: String,
      enum: [
        'Pending',
        'Reviewed',
        'Approved',
        'Partially Approved',
        'Allocated',
        'Dispatched',
        'Delivered',
        'Rejected',
        'Closed'
      ],
      default: 'Pending',
      index: true
    },
    assignedOperatorId: {
      type: String,
      default: null
    },
    assignedOperatorName: {
      type: String,
      default: null
    },
    rejectionReason: {
      type: String,
      default: ''
    },
    partialReason: {
      type: String,
      default: ''
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

module.exports = mongoose.models.ResourceRequest || mongoose.model('ResourceRequest', ResourceRequestSchema);
