/**
 * models/SiteContent.js
 *
 * Staff-maintained, DB-backed site content by slug.
 *
 * Used for pages like Pathways where read is public but writes require staff permissions.
 */
const mongoose = require('mongoose');

const SiteContentSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    html: { type: String, required: true, default: '' },
    isActive: { type: Boolean, default: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('SiteContent', SiteContentSchema);
