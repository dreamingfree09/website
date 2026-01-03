/**
 * models/PortfolioInvite.js
 *
 * Invite tokens for viewing a user's personal portfolio.
 *
 * Security:
 * - Store only a SHA-256 hash of the token.
 * - Return the raw token only at creation time.
 */
const mongoose = require('mongoose');

const PortfolioInviteSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    tokenHash: { type: String, required: true, unique: true, index: true },
    tokenLast4: { type: String, default: '' },
    expiresAt: { type: Date, default: null },
    revokedAt: { type: Date, default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

PortfolioInviteSchema.index({ owner: 1, createdAt: -1 });
PortfolioInviteSchema.index({ expiresAt: 1 });

module.exports = mongoose.model('PortfolioInvite', PortfolioInviteSchema);
