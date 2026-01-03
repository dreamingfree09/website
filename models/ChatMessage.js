/**
 * models/ChatMessage.js
 *
 * Chat message storage.
 *
 * Includes an expiration timestamp (expiresAt) used to auto-delete messages after a
 * retention window.
 */
const mongoose = require('mongoose');

function addMonths(date, months) {
  const d = new Date(date);
  const originalDay = d.getDate();
  d.setMonth(d.getMonth() + months);

  // If the target month doesn't have the original day (e.g. Jan 31 -> Feb),
  // JS will roll into the next month. Clamp by stepping back.
  if (d.getDate() !== originalDay) {
    d.setDate(0);
  }

  return d;
}

const ChatMessageSchema = new mongoose.Schema(
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
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000
    },
    editedAt: {
      type: Date,
      default: null
    },
    deletedAt: {
      type: Date,
      default: null,
      index: true
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

ChatMessageSchema.index({ room: 1, createdAt: -1 });
// TTL index will be ensured explicitly in config/indexes.js

module.exports = mongoose.model('ChatMessage', ChatMessageSchema);
