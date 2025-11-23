import mongoose from 'mongoose';

const hashtagSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
  },
  description: {
    type: String,
    trim: true,
  },
  usageCount: {
    type: Number,
    default: 0,
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

hashtagSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

// Index for faster search
hashtagSchema.index({ name: 'text' });

export default mongoose.model('Hashtag', hashtagSchema);

