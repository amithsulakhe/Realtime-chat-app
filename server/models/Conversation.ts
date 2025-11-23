import mongoose from 'mongoose';

const conversationSchema = new mongoose.Schema({
  title: {
    type: String,
    default: 'New Chat',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

conversationSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

export default mongoose.model('Conversation', conversationSchema);
