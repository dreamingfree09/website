/**
 * models/Post.js
 *
 * Forum posts and replies.
 *
 * Includes support for question posts with an accepted reply, voting metadata,
 * and curated tag slugs.
 */
const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  postType: {
    type: String,
    enum: ['discussion', 'question'],
    default: 'discussion',
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200,
  },
  content: {
    type: String,
    required: true,
    maxlength: 5000,
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  category: {
    type: String,
    required: true,
    enum: ['general', 'frontend', 'backend', 'learning', 'showcase', 'career'],
  },
  acceptedReplyId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null,
  },
  voteScore: {
    type: Number,
    default: 0,
  },
  voteUpCount: {
    type: Number,
    default: 0,
  },
  voteDownCount: {
    type: Number,
    default: 0,
  },
  replies: [{
    content: String,
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    editedAt: {
      type: Date,
      default: null,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
    deletedContent: {
      type: String,
      default: null,
      maxlength: 5000,
    },
    parentReplyId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    depth: {
      type: Number,
      default: 1,
      min: 1,
      max: 5,
    },
    voteScore: {
      type: Number,
      default: 0,
    },
    voteUpCount: {
      type: Number,
      default: 0,
    },
    voteDownCount: {
      type: Number,
      default: 0,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    }
  }],
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  views: {
    type: Number,
    default: 0,
  },
  isPinned: {
    type: Boolean,
    default: false,
  },
  tags: [String],
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
  deletedAt: {
    type: Date,
    default: null,
    index: true,
  }
});

// Update the updatedAt timestamp before saving
postSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Post', postSchema);
