/**
 * models/Document.js
 *
 * User-uploaded documents intended for share-card downloads (CV, cover letter, etc.).
 * Files are stored outside the public web root and are served only via authenticated
 * endpoints or via token-gated share card downloads.
 */
const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    type: {
      type: String,
      enum: ['CV', 'CoverLetter', 'Certificate', 'Transcript', 'Other'],
      default: 'Other',
      index: true,
    },

    label: { type: String, trim: true, maxlength: 120, default: '' },

    originalName: { type: String, trim: true, maxlength: 200, required: true },
    storedName: { type: String, trim: true, maxlength: 220, required: true, unique: true, index: true },
    extension: { type: String, trim: true, maxlength: 16, default: '' },
    mimeType: { type: String, trim: true, maxlength: 120, default: '' },
    sizeBytes: { type: Number, min: 0, required: true },

    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Document', documentSchema);
