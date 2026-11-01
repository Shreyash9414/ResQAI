const mongoose = require('mongoose');
const { LANGUAGE_CODES } = require('../config/languages');

const chatMessageSchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ['user', 'assistant', 'system'],
    required: true
  },
  content: {
    type: String,
    required: true
  },
  language: {
    type: String,
    enum: LANGUAGE_CODES,
    default: 'en'
  },
  detectedLanguage: {
    type: String,
    default: null
  },
  confidence: {
    type: String,
    default: null
  },
  direction: {
    type: String,
    enum: ['ltr', 'rtl'],
    default: 'ltr'
  },
  source: {
    type: String,
    enum: ['official_resqai_records', 'safety_protocol', 'ai_guidance', 'sos_guided', 'emergency_hotline'],
    default: 'ai_guidance'
  },
  liveData: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  actionButtons: [{
    label: String,
    action: String,
    payload: String,
    url: String
  }],
  timestamp: {
    type: Date,
    default: Date.now
  }
}, { _id: false });

const chatSessionSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  userId: {
    type: String,
    default: null,
    index: true
  },
  language: {
    type: String,
    enum: LANGUAGE_CODES,
    default: 'auto'
  },
  messages: [chatMessageSchema],
  lastActivity: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Automatic data retention: expire chat sessions after 7 days
chatSessionSchema.index({ lastActivity: 1 }, { expireAfterSeconds: 7 * 24 * 60 * 60 });

module.exports = mongoose.models.ChatSession || mongoose.model('ChatSession', chatSessionSchema);
