/**
 * models/Portfolio.js
 *
 * Per-user portfolio document.
 *
 * Constraints:
 * - One portfolio per user (owner is unique)
 * - isPublic controls visibility of the public portfolio page
 */
const mongoose = require('mongoose');

const portfolioProjectSchema = new mongoose.Schema(
  {
    title: { type: String, trim: true, maxlength: 120, default: '' },
    description: { type: String, trim: true, maxlength: 2000, default: '' },
    demoUrl: { type: String, trim: true, maxlength: 500, default: '' },
    repoUrl: { type: String, trim: true, maxlength: 500, default: '' },
    tags: [{ type: String, trim: true, maxlength: 30 }],
  },
  { _id: false }
);

const portfolioSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },

    headline: { type: String, trim: true, maxlength: 120, default: '' },
    bio: { type: String, trim: true, maxlength: 2000, default: '' },
    skills: [{ type: String, trim: true, maxlength: 30 }],

    projects: [portfolioProjectSchema],

    // Public by default so people can share it; users can turn it off.
    isPublic: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Portfolio', portfolioSchema);
