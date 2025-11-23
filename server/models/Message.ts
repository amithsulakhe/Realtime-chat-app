import mongoose from 'mongoose';

const segmentSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['text', 'hashtag', 'mention'],
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  id: {
    type: String,
    required: false,
  },
  name: {
    type: String,
    required: false,
  },
}, { _id: false });

const messageSchema = new mongoose.Schema({
  conversationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation',
    required: true,
  },
  type: {
    type: String,
    enum: ['user', 'bot'],
    required: true,
    default: 'user',
  },
  content: {
    type: String,
    required: true,
  },
  segments: {
    type: [segmentSchema],
    default: [],
  },
  currentText: {
    type: String,
    default: '',
  },
  timestamp: {
    type: String,
    required: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model('Message', messageSchema);
