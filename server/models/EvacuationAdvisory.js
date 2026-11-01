const mongoose = require('mongoose');

const evacuationAdvisorySchema = new mongoose.Schema(
  {
    advisoryId: { type: String, required: true, unique: true },
    disasterId: { type: String, default: null },
    disasterTitle: { type: String, required: true },
    disasterType: { type: String, required: true },
    severity: {
      type: String,
      enum: ['ADVISORY', 'VOLUNTARY', 'WATCH', 'WARNING', 'MANDATORY', 'MANDATORY_EVACUATION', 'SHELTER_IN_PLACE', 'LIFTED'],
      default: 'ADVISORY'
    },
    affectedArea: {
      center: {
        lat: { type: Number, required: true },
        lng: { type: Number, required: true }
      },
      radiusMeters: { type: Number, default: 2000 },
      description: { type: String, default: 'Designated Danger Perimeter' }
    },
    designatedSafeZones: [
      {
        id: { type: String },
        name: { type: String },
        type: { type: String, default: 'Relief Shelter' },
        address: { type: String },
        location: {
          lat: { type: Number },
          lng: { type: Number }
        },
        capacityAvailable: { type: Number, default: 100 }
      }
    ],
    instructions: [{ type: String }],
    publishedBy: {
      id: { type: String, default: 'usr_operator' },
      name: { type: String, default: 'Emergency Command Operator' },
      role: { type: String, default: 'Emergency Operator' }
    },
    publishedAt: { type: Date, default: Date.now },
    status: {
      type: String,
      enum: ['ACTIVE', 'EXPIRED', 'LIFTED'],
      default: 'ACTIVE'
    },
    auditLog: [
      {
        action: { type: String },
        operatorName: { type: String },
        timestamp: { type: Date, default: Date.now },
        details: { type: String }
      }
    ]
  },
  { timestamps: true }
);

evacuationAdvisorySchema.index({ status: 1 });
evacuationAdvisorySchema.index({ publishedAt: -1 });

module.exports = mongoose.model('EvacuationAdvisory', evacuationAdvisorySchema);
