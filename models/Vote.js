/**
 * models/Vote.js
 *
 * Vote records for posts and replies.
 *
 * The unique index enforces one vote per voter per target.
 */
const mongoose = require('mongoose');

const voteSchema = new mongoose.Schema({
  voter: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  post: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post',
    required: true,
    index: true
  },
  replyId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null
  },
  targetType: {
    type: String,
    enum: ['post', 'reply'],
    required: true,
    index: true
  },
  value: {
    type: Number,
    enum: [1, -1],
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// One vote per voter per target
voteSchema.index(
  { voter: 1, post: 1, replyId: 1, targetType: 1 },
  { unique: true }
);

module.exports = mongoose.model('Vote', voteSchema);
