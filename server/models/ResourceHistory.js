const mongoose = require('mongoose');

const ResourceHistorySchema = new mongoose.Schema(
  {
    historyId: {
      type: String,
      required: true,
      unique: true,
      index: true
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
    previousQuantity: {
      type: Number,
      required: true
    },
    changeQuantity: {
      type: Number,
      required: true
    },
    newQuantity: {
      type: Number,
      required: true
    },
    transactionType: {
      type: String,
      enum: [
        'REGISTER',
        'UPDATE_STOCK',
        'ALLOCATE',
        'DISPATCH',
        'RETURN',
        'CONSUME',
        'MAINTENANCE',
        'STATUS_CHANGE',
        'EXPIRED',
        'DEACTIVATE'
      ],
      required: true,
      index: true
    },
    relatedRequestId: {
      type: String,
      default: null
    },
    relatedIncidentId: {
      type: String,
      default: null
    },
    performedBy: {
      type: String,
      required: true,
      default: 'System Operator'
    },
    performedByRole: {
      type: String,
      default: 'Operator'
    },
    reason: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.models.ResourceHistory || mongoose.model('ResourceHistory', ResourceHistorySchema);
