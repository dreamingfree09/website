/**
 * models/Tag.js
 *
 * Curated tags used across the forum and resource library.
 *
 * Tags are referenced by slug, which is validated/normalized in API routes.
 */
const mongoose = require('mongoose');

const tagSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 60,
    },
    slug: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 60,
      unique: true,
      match: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    },
    category: {
      type: String,
      required: true,
      trim: true,
      maxlength: 40,
      default: 'general',
    },
    description: {
      type: String,
      default: '',
      trim: true,
      maxlength: 240,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    isSystem: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

tagSchema.index({ category: 1, name: 1 });

module.exports = mongoose.model('Tag', tagSchema);
