const mongoose = require('mongoose');

const hospitalSchema = new mongoose.Schema(
  {
    hospitalId: { type: String, unique: true, sparse: true },
    name: { type: String, required: true },
    address: { type: String, required: true, default: 'Emergency Healthcare Center' },
    contactPhone: { type: String, default: '+91 98765 43210' },
    imageUrl: { type: String, default: 'https://images.unsplash.com/photo-1587351021759-3e566b6af7cc?auto=format&fit=crop&w=600&q=80' },
    location: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
      address: { type: String, default: 'Emergency Healthcare Center' }
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
    generalBeds: {
      total: { type: Number, required: true, min: 0, default: 100 },
      available: { type: Number, required: true, min: 0, default: 35 }
    },
    icuBeds: {
      total: { type: Number, required: true, min: 0, default: 20 },
      available: { type: Number, required: true, min: 0, default: 5 }
    },
    emergencyBeds: { type: Number, default: 15 },
    availableEmergencyBeds: { type: Number, default: 6 },
    emergencyDepartmentStatus: {
      type: String,
      enum: ['AVAILABLE', 'BUSY', 'UNAVAILABLE'],
      default: 'AVAILABLE'
    },
    ambulanceReceivingStatus: {
      type: String,
      enum: ['ACCEPTING', 'NOT_ACCEPTING', 'UNKNOWN'],
      default: 'ACCEPTING'
    },
    emergencyServices: [
      {
        type: String,
        enum: [
          'Trauma Care',
          'Emergency Medicine',
          'Surgery',
          'Oxygen Support',
          'Pediatric ICU',
          'Burn Unit',
          'CT/MRI Scan',
          'Blood Bank',
          'Cardiac Care'
        ]
      }
    ],
    availabilitySource: {
      type: String,
      enum: ['OFFICIAL_API', 'MANUAL_REPORTED'],
      default: 'MANUAL_REPORTED'
    },
    lastAvailabilityUpdate: { type: Date, default: Date.now },
    availabilityStatus: {
      type: String,
      enum: ['CURRENT', 'STALE', 'UNKNOWN'],
      default: 'CURRENT'
    },
    assignedStaffIds: [{ type: String }],
    updatedBy: { type: String, default: 'System' },
    doctorsOnDuty: { type: Number, default: 12 },
    ventilators: { type: Number, default: 6 }
  },
  { timestamps: true }
);

// Pre-save validation: Ensure available beds do not exceed total capacities
hospitalSchema.pre('save', function (next) {
  if (this.generalBeds && this.generalBeds.available > this.generalBeds.total) {
    return next(new Error('Available general beds cannot exceed total general bed capacity.'));
  }
  if (this.icuBeds && this.icuBeds.available > this.icuBeds.total) {
    return next(new Error('Available ICU beds cannot exceed total ICU bed capacity.'));
  }
  
  // Calculate freshness status automatically (stale if > 1 hour old)
  if (this.lastAvailabilityUpdate) {
    const ageHours = (Date.now() - new Date(this.lastAvailabilityUpdate).getTime()) / (1000 * 60 * 60);
    if (ageHours > 1) {
      this.availabilityStatus = 'STALE';
    } else {
      this.availabilityStatus = 'CURRENT';
    }
  }
  
  next();
});

hospitalSchema.index({ geoPoint: '2dsphere' });
hospitalSchema.index({ 'location': '2dsphere' });

module.exports = mongoose.models.Hospital || mongoose.model('Hospital', hospitalSchema);
