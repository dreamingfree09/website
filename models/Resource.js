/**
 * models/Resource.js
 *
 * Curated learning resource entry.
 *
 * A resource can be an external link, or a PDF uploaded to
 * public/uploads/resources and referenced via fileUrl.
 */
const mongoose = require('mongoose');

const resourceSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    description: {
      type: String,
      default: '',
      trim: true,
      maxlength: 2000,
    },
    kind: {
      type: String,
      required: true,
      enum: ['documentation', 'course', 'video', 'article', 'practice', 'tool', 'pdf'],
      default: 'documentation',
    },
    level: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced', 'all'],
      default: 'all',
    },

    // For link-based resources
    url: {
      type: String,
      default: '',
      trim: true,
      maxlength: 1000,
    },

    // For PDF uploads stored in /public/uploads/resources
    fileUrl: {
      type: String,
      default: '',
      trim: true,
      maxlength: 300,
    },
    fileOriginalName: {
      type: String,
      default: '',
      trim: true,
      maxlength: 200,
    },
    fileMimeType: {
      type: String,
      default: '',
      trim: true,
      maxlength: 100,
    },
    fileSize: {
      type: Number,
      default: 0,
      min: 0,
    },

    tags: {
      type: [String],
      default: [],
      validate: {
        validator: (arr) => Array.isArray(arr) && arr.length <= 12,
        message: 'Too many tags',
      },
    },

    // Optional metadata to help learners discover the right format/source.
    // Examples:
    // - platformName: "freeCodeCamp" / "Khan Academy" / "Coursera" (free courses)
    // - creatorName: "NetworkChuck" / "Traversy Media" (YouTube creators/channels)
    platformName: {
      type: String,
      default: '',
      trim: true,
      maxlength: 120,
    },
    platformUrl: {
      type: String,
      default: '',
      trim: true,
      maxlength: 1000,
    },
    creatorName: {
      type: String,
      default: '',
      trim: true,
      maxlength: 120,
    },
    creatorUrl: {
      type: String,
      default: '',
      trim: true,
      maxlength: 1000,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    // Stable uniqueness key for seed + de-dupe: link:<url> or pdf:<fileUrl>
    key: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      maxlength: 1200,
    },
  },
  {
    timestamps: true,
  }
);

resourceSchema.index({ tags: 1, createdAt: -1 });
resourceSchema.index({ kind: 1, createdAt: -1 });
resourceSchema.index({ isActive: 1, createdAt: -1 });

module.exports = mongoose.model('Resource', resourceSchema);
