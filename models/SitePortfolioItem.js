/**
 * models/SitePortfolioItem.js
 *
 * Site-wide portfolio items curated by staff (Content role and above).
 * These are visible to everyone under the Portfolio tab.
 */
const mongoose = require('mongoose');

const SitePortfolioItemSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 140 },
    summary: { type: String, default: '', trim: true, maxlength: 2000 },
    linkUrl: { type: String, default: '', trim: true, maxlength: 500 },
    imageUrl: { type: String, default: '', trim: true, maxlength: 500 },
    tags: [{ type: String, trim: true, maxlength: 30 }],
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

SitePortfolioItemSchema.index({ isActive: 1, sortOrder: 1, updatedAt: -1 });

module.exports = mongoose.model('SitePortfolioItem', SitePortfolioItemSchema);
