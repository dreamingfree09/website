/**
 * models/ShareCardToken.js
 *
 * Expiring share links for the combined Bio + Portfolio share card.
 * Stores only a hash of the token for security.
 */
const mongoose = require('mongoose');

const shareCardTokenSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    tokenHash: { type: String, required: true, unique: true, index: true },

    include: {
      sections: {
        identity: { type: Boolean, default: true },
        about: { type: Boolean, default: true },
        careerIntent: { type: Boolean, default: true },
        skills: { type: Boolean, default: true },
        experience: { type: Boolean, default: true },
        learning: { type: Boolean, default: true },
        portfolio: { type: Boolean, default: true },
        links: { type: Boolean, default: true },
        documents: { type: Boolean, default: true },
      },
      // Fine-grained field toggles. Keep this flexible to avoid constant migrations.
      fieldOverrides: { type: Object, default: {} },
    },

    allowedDocumentIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Document' }],

    expiresAt: { type: Date, required: true, index: true },
    revokedAt: { type: Date, default: null },

    viewCount: { type: Number, default: 0 },
    lastViewedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ShareCardToken', shareCardTokenSchema);
