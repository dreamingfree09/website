/**
 * models/AuditLog.js
 *
 * Audit log entries for security-sensitive admin actions.
 *
 * Designed to be append-only; admin routes should not fail if audit writes fail.
 */
const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  actor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  action: {
    type: String,
    required: true,
    index: true,
  },
  targetUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
    index: true,
  },
  targetRole: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Role',
    default: null,
  },
  details: {
    type: Object,
    default: {},
  },
  // Pseudonymized identifiers (preferred for privacy-minded auditing)
  ipHash: {
    type: String,
    default: '',
    index: true,
  },
  userAgentHash: {
    type: String,
    default: '',
    index: true,
  },
  ip: {
    type: String,
    default: '',
  },
  userAgent: {
    type: String,
    default: '',
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
});

module.exports = mongoose.model('AuditLog', auditLogSchema);
