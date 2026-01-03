/**
 * models/Role.js
 *
 * RBAC roles.
 *
 * Roles contain a set of permission strings from the permissions catalog.
 * System roles may be seeded/updated automatically; custom roles are not overwritten.
 */
const mongoose = require('mongoose');

const roleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    maxlength: 50,
  },
  description: {
    type: String,
    default: '',
    maxlength: 500,
  },
  permissions: {
    type: [String],
    default: [],
  },
  isSystem: {
    type: Boolean,
    default: false,
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

roleSchema.index({ name: 1 }, { unique: true });

roleSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('Role', roleSchema);
