/**
 * models/ChatRoom.js
 *
 * Chat rooms (public and private).
 *
 * Private rooms may have an invite code and/or password hash.
 */
const mongoose = require('mongoose');

const ChatRoomSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 50
    },
    isPrivate: {
      type: Boolean,
      default: false
    },
    inviteCode: {
      type: String,
      default: undefined
    },
    passwordHash: {
      type: String,
      default: undefined
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    lastActiveAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    versionKey: false
  }
);

ChatRoomSchema.index({ name: 1 }, { unique: true });
ChatRoomSchema.index({ inviteCode: 1 }, { unique: true, sparse: true });
ChatRoomSchema.index({ isPrivate: 1, lastActiveAt: -1 });

module.exports = mongoose.model('ChatRoom', ChatRoomSchema);
