const mongoose = require('mongoose');

const disasterPredictionSchema = new mongoose.Schema(
  {
    predictionId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    disasterType: {
      type: String,
      enum: ['Flood', 'Heavy Rainfall', 'Cyclone', 'Heatwave', 'Severe Thunderstorm', 'Landslide', 'Fire', 'Other'],
      required: true
    },
    title: {
      type: String,
      required: true
    },
    description: {
      type: String,
      default: ''
    },
    affectedArea: {
      name: { type: String, required: true },
      center: {
        lat: { type: Number, required: true },
        lng: { type: Number, required: true }
      },
      radiusKm: { type: Number, default: 25 }
    },
    predictedRiskLevel: {
      type: String,
      enum: ['Low', 'Moderate', 'High', 'Critical'],
      required: true,
      index: true
    },
    confidenceScore: {
      type: Number,
      min: 0,
      max: 1,
      default: 0.85
    },
    predictionNature: {
      type: String,
      enum: ['RULE_BASED_AI_PREDICTION', 'VALIDATED_ML_MODEL', 'OFFICIAL_METEOROLOGICAL_ALERT'],
      default: 'RULE_BASED_AI_PREDICTION'
    },
    forecastWindow: {
      startTime: { type: Date, required: true },
      endTime: { type: Date, required: true },
      durationHours: { type: Number, default: 24 }
    },
    weatherMetrics: {
      rainfallForecastMm: { type: Number, default: 0 },
      peakWindSpeedKmh: { type: Number, default: 0 },
      peakTemperatureC: { type: Number, default: 0 },
      atmosphericPressureHpa: { type: Number, default: 1013 },
      floodRiskIndex: { type: Number, default: 0 }
    },
    supportingDataSources: [
      { type: String }
    ],
    safetyPrecautions: [
      { type: String }
    ],
    status: {
      type: String,
      enum: ['Evaluating', 'Predicted', 'Under Review', 'Confirmed', 'Expired', 'Failed'],
      default: 'Predicted',
      index: true
    },
    operatorReview: {
      reviewed: { type: Boolean, default: false },
      reviewedBy: { type: String, default: null },
      reviewedAt: { type: Date, default: null },
      notes: { type: String, default: '' }
    },
    deduplicationKey: {
      type: String,
      required: true,
      index: true
    },
    emailNotification: {
      triggered: { type: Boolean, default: false },
      triggeredAt: { type: Date, default: null },
      thresholdMet: { type: Boolean, default: false },
      recipientCount: { type: Number, default: 0 },
      queuedCount: { type: Number, default: 0 },
      acceptedCount: { type: Number, default: 0 },
      failedCount: { type: Number, default: 0 },
      deliveryStatus: {
        type: String,
        enum: ['NOT_TRIGGERED', 'QUEUED', 'SENDING', 'ACCEPTED', 'ACCEPTED_BY_PROVIDER', 'DELIVERED', 'PARTIAL_FAILURE', 'FAILED', 'SKIPPED_DUPLICATE', 'PAUSED'],
        default: 'NOT_TRIGGERED'
      },
      failureReason: { type: String, default: '' },
      campaignId: { type: String, default: '' },
      providerResponse: { type: String, default: '' },
      recipients: [
        {
          email: { type: String },
          name: { type: String },
          status: { type: String, enum: ['QUEUED', 'SENDING', 'ACCEPTED', 'ACCEPTED_BY_PROVIDER', 'DELIVERED', 'FAILED'] },
          messageId: { type: String },
          providerResponse: { type: String },
          attempts: { type: Number, default: 0 },
          sentAt: { type: Date },
          error: { type: String }
        }
      ]
    },
    auditLogs: [
      {
        action: { type: String },
        operatorOrSystem: { type: String },
        timestamp: { type: Date, default: Date.now },
        details: { type: String }
      }
    ],
    expiresAt: {
      type: Date,
      required: true
    }
  },
  { timestamps: true }
);

disasterPredictionSchema.index({ deduplicationKey: 1, expiresAt: 1 });
disasterPredictionSchema.index({ createdAt: -1 });

module.exports = mongoose.models.DisasterPrediction || mongoose.model('DisasterPrediction', disasterPredictionSchema);
