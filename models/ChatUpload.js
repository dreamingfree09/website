/**
 * models/ChatUpload.js
 *
 * File uploads shared in chat.
 *
 * Similar to chat messages, uploads can have a retention window via expiresAt.
 */
const mongoose = require('mongoose');

function addMonths(date, months) {
  const d = new Date(date);
  const originalDay = d.getDate();
  d.setMonth(d.getMonth() + months);

  if (d.getDate() !== originalDay) {
    d.setDate(0);
  }

  return d;
}

const ChatUploadSchema = new mongoose.Schema(
  {
    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ChatRoom',
      required: true,
      index: true
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    username: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50
    },
    originalName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200
    },
    storedName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 260,
      unique: true
    },
    mimeType: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100
    },
    size: {
      type: Number,
      required: true,
      min: 0
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: true
    },
    // Auto-delete at 5 calendar months after creation.
    expiresAt: {
      type: Date,
      default: function expiresAtDefault() {
        return addMonths(new Date(), 5);
      },
      index: true
    }
  },
  {
    versionKey: false
  }
);

ChatUploadSchema.index({ room: 1, createdAt: -1 });

module.exports = mongoose.model('ChatUpload', ChatUploadSchema);
