/**
 * routes/shareCardAdmin.js
 *
 * Authenticated management endpoints for share-card tokens.
 *
 * - GET    /api/share-card            -> list tokens
 * - POST   /api/share-card            -> create token
 * - POST   /api/share-card/:id/revoke -> revoke token
 */
const express = require('express');
const crypto = require('crypto');

const { isAuthenticated } = require('../middleware/auth');
const { Logger } = require('../utils/logger');
const Document = require('../models/Document');
const ShareCardToken = require('../models/ShareCardToken');

const router = express.Router();

const MAX_EXPIRY_DAYS = 365;

function sha256Hex(input) {
  return crypto.createHash('sha256').update(String(input)).digest('hex');
}

function normalizeSections(input) {
  const raw = input && typeof input === 'object' ? input : {};
  const defaults = {
    identity: true,
    about: true,
    careerIntent: true,
    skills: true,
    experience: true,
    learning: true,
    portfolio: true,
    links: true,
    documents: true,
  };

  const out = { ...defaults };
  for (const k of Object.keys(defaults)) {
    if (raw[k] !== undefined) out[k] = Boolean(raw[k]);
  }
  return out;
}

function parseAllowedDocumentIds(value) {
  const arr = Array.isArray(value) ? value : [];
  return arr
    .map((v) => String(v || '').trim())
    .filter(Boolean)
    .slice(0, 50);
}

// GET /api/share-card
router.get('/', isAuthenticated, async (req, res) => {
  try {
    const ownerId = req.session.userId;
    const tokens = await ShareCardToken.find({ owner: ownerId })
      .select('_id createdAt expiresAt revokedAt viewCount lastViewedAt include')
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    res.json({ items: tokens || [] });
  } catch (error) {
    Logger.error('List share cards failed', { error: error?.message });
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/share-card
router.post('/', isAuthenticated, async (req, res) => {
  try {
    const ownerId = req.session.userId;

    const expiresInDaysRaw = Number.parseInt(String(req.body?.expiresInDays || ''), 10);
    const expiresInDays = Number.isFinite(expiresInDaysRaw)
      ? Math.min(Math.max(expiresInDaysRaw, 1), MAX_EXPIRY_DAYS)
      : 30;

    const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);

    const sections = normalizeSections(req.body?.include?.sections);
    const fieldOverrides = (req.body?.include?.fieldOverrides && typeof req.body.include.fieldOverrides === 'object')
      ? req.body.include.fieldOverrides
      : {};

    const requestedDocIds = parseAllowedDocumentIds(req.body?.allowedDocumentIds);

    // Ensure requested documents exist and belong to the user.
    let allowedDocumentIds = [];
    if (sections.documents && requestedDocIds.length) {
      const docs = await Document.find({ _id: { $in: requestedDocIds }, owner: ownerId, deletedAt: null })
        .select('_id')
        .lean();
      allowedDocumentIds = (docs || []).map((d) => d._id);
    }

    const tokenRaw = crypto.randomBytes(32).toString('base64url');
    const tokenHash = sha256Hex(tokenRaw);

    const tokenDoc = await ShareCardToken.create({
      owner: ownerId,
      tokenHash,
      include: {
        sections,
        fieldOverrides,
      },
      allowedDocumentIds,
      expiresAt,
    });

    const relativeUrl = `/share/card/${encodeURIComponent(tokenRaw)}`;
    const baseUrl = String(process.env.BASE_URL || '').trim();
    const absoluteUrl = baseUrl ? `${baseUrl.replace(/\/$/, '')}${relativeUrl}` : '';

    Logger.info('Share card created', {
      userId: ownerId,
      shareCardId: String(tokenDoc._id),
      expiresAt: tokenDoc.expiresAt,
      documentsAllowed: allowedDocumentIds.length,
    });

    res.status(201).json({
      shareCard: {
        id: tokenDoc._id.toString(),
        createdAt: tokenDoc.createdAt,
        expiresAt: tokenDoc.expiresAt,
        revokedAt: tokenDoc.revokedAt,
        include: tokenDoc.include,
        viewCount: tokenDoc.viewCount,
        lastViewedAt: tokenDoc.lastViewedAt,
      },
      url: relativeUrl,
      absoluteUrl,
    });
  } catch (error) {
    Logger.error('Create share card failed', { error: error?.message });
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/share-card/:id/revoke
router.post('/:id/revoke', isAuthenticated, async (req, res) => {
  try {
    const ownerId = req.session.userId;
    const id = String(req.params.id || '').trim();

    const updated = await ShareCardToken.findOneAndUpdate(
      { _id: id, owner: ownerId },
      { $set: { revokedAt: new Date() } },
      { new: true }
    ).select('_id revokedAt');

    if (!updated) {
      return res.status(404).json({ error: 'Not found' });
    }

    Logger.info('Share card revoked', { userId: ownerId, shareCardId: id });
    res.json({ message: 'Revoked' });
  } catch (error) {
    Logger.error('Revoke share card failed', { error: error?.message });
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
