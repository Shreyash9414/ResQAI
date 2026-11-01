const mongoose = require('mongoose');

const possibleMatchSchema = new mongoose.Schema({
  targetCaseId: { type: String, required: true },
  targetRecordType: { type: String, enum: ['MISSING', 'FOUND'], required: true },
  matchScore: { type: Number, default: 0 }, // 0 to 100 percentage
  matchReason: { type: String, default: '' },
  matchedName: { type: String, default: '' },
  matchedPhotoUrl: { type: String, default: '' },
  matchedAge: { type: Number, default: 0 },
  matchedLocation: { type: String, default: '' },
  status: {
    type: String,
    enum: ['SUGGESTED', 'UNDER_INVESTIGATION', 'CONFIRMED_MATCH', 'REJECTED'],
    default: 'SUGGESTED'
  },
  investigatedBy: { type: String, default: '' },
  investigatedAt: { type: Date },
  verificationNotes: { type: String, default: '' }
}, { _id: false });

const auditLogSchema = new mongoose.Schema({
  action: { type: String, required: true },
  performedBy: { type: String, required: true },
  performedByRole: { type: String, default: 'Authorized Staff' },
  timestamp: { type: Date, default: Date.now },
  notes: { type: String, default: '' },
  previousStatus: { type: String },
  newStatus: { type: String }
}, { _id: false });

const missingPersonSchema = new mongoose.Schema({
  caseId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  recordType: {
    type: String,
    enum: ['MISSING', 'FOUND'],
    default: 'MISSING',
    required: true,
    index: true
  },
  fullName: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  age: {
    type: Number,
    required: true,
    min: 0,
    max: 130
  },
  gender: {
    type: String,
    enum: ['Male', 'Female', 'Other', 'Unknown'],
    default: 'Male'
  },
  photoUrl: {
    type: String,
    default: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80'
  },
  lastSeenLocation: {
    type: String,
    required: true
  },
  approximateArea: {
    type: String,
    default: ''
  },
  coordinates: {
    lat: { type: Number, default: 28.6139 },
    lng: { type: Number, default: 77.2090 }
  },
  geoPoint: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      default: [77.2090, 28.6139]
    }
  },
  dateTimeLastSeen: {
    type: Date,
    default: Date.now
  },
  description: {
    type: String,
    default: ''
  },
  distinguishingFeatures: [{
    type: String
  }],
  medicalCondition: {
    type: String,
    default: 'Stable'
  },
  disasterIncidentId: {
    type: String,
    default: 'INC-GENERAL-DELHI',
    index: true
  },
  shelterOrHospitalId: {
    type: String,
    default: ''
  },
  shelterOrHospitalName: {
    type: String,
    default: ''
  },
  intakeOfficer: {
    userId: { type: String, default: '' },
    name: { type: String, default: '' },
    badgeOrId: { type: String, default: '' },
    organization: { type: String, default: 'Disaster Relief Authority' }
  },
  
  // Reporter & Contact Information
  familyContactName: {
    type: String,
    required: true
  },
  familyContactPhone: {
    type: String,
    required: true
  },
  familyContactEmail: {
    type: String,
    default: ''
  },
  relationshipToPerson: {
    type: String,
    default: 'Family Member'
  },
  consentForPublicListing: {
    type: Boolean,
    default: true
  },
  isConfidential: {
    type: Boolean,
    default: false
  },

  // Case Status Lifecycle
  status: {
    type: String,
    enum: [
      'Reported',
      'Searching',
      'Possible Match',
      'Under Verification',
      'Verified',
      'Reunited',
      'Closed',
      'Missing',
      'Found',
      'Hospitalized'
    ],
    default: 'Reported',
    index: true
  },
  aiFaceMatchScore: {
    type: Number,
    default: 0
  },
  matchCandidateNotes: {
    type: String,
    default: ''
  },
  possibleMatches: [possibleMatchSchema],
  verifiedMatchedCaseId: {
    type: String,
    default: ''
  },
  reunitedWith: {
    name: { type: String, default: '' },
    contact: { type: String, default: '' },
    relationship: { type: String, default: '' },
    verifiedBy: { type: String, default: '' },
    verifiedAt: { type: Date },
    notes: { type: String, default: '' }
  },
  auditLogs: [auditLogSchema]
}, {
  timestamps: true
});

// Indexes for high performance searches
missingPersonSchema.index({ fullName: 'text', description: 'text', lastSeenLocation: 'text' });
missingPersonSchema.index({ geoPoint: '2dsphere' });
missingPersonSchema.index({ status: 1, recordType: 1 });
missingPersonSchema.index({ createdAt: -1 });

/**
 * Redacts confidential and sensitive data for public viewing
 */
missingPersonSchema.methods.toPublicJSON = function() {
  const obj = this.toObject();
  obj.id = obj.caseId || obj._id.toString();

  // Mask phone number: e.g. "+91 98123 99900" -> "+91 98*** **900"
  if (obj.familyContactPhone) {
    const raw = obj.familyContactPhone.trim();
    if (raw.length > 5) {
      obj.familyContactPhone = raw.slice(0, 4) + '*** ***' + raw.slice(-3);
    } else {
      obj.familyContactPhone = '*** PROTECTED ***';
    }
  }

  // Mask email: e.g. "sunita@gmail.com" -> "su***@gmail.com"
  if (obj.familyContactEmail) {
    const parts = obj.familyContactEmail.split('@');
    if (parts.length === 2) {
      obj.familyContactEmail = parts[0].slice(0, 2) + '***@' + parts[1];
    } else {
      obj.familyContactEmail = '***@domain.com';
    }
  }

  // Obfuscate exact coordinates for public if confidential
  if (obj.isConfidential || !obj.consentForPublicListing) {
    if (obj.coordinates) {
      obj.coordinates.lat = Number(obj.coordinates.lat.toFixed(2));
      obj.coordinates.lng = Number(obj.coordinates.lng.toFixed(2));
    }
  }

  // Filter sensitive internal match candidate details
  if (obj.possibleMatches) {
    obj.possibleMatches = obj.possibleMatches.map(m => ({
      targetCaseId: m.targetCaseId,
      targetRecordType: m.targetRecordType,
      matchScore: m.matchScore,
      matchReason: m.matchReason,
      status: m.status
    }));
  }

  return obj;
};

module.exports = mongoose.model('MissingPerson', missingPersonSchema);
