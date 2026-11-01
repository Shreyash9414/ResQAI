const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  senderId: { type: String, required: true },
  senderName: { type: String, required: true },
  senderRole: { type: String, required: true },
  recipientRole: { type: String, default: 'All' }, // All, Operator, Police, Ambulance, Fire, Hospital
  channelId: { type: String, default: 'general-command' },
  text: { type: String, required: true },
  attachmentUrl: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Message', messageSchema);
