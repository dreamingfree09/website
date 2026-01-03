/**
 * routes/share.js
 *
 * Public share-card routes (capability URLs).
 *
 * - GET  /share/card/:token           -> HTML shell
 * - GET  /share/card/:token/data      -> filtered JSON payload
 * - GET  /share/card/:token/download/:documentId -> attachment download
 */
const express = require('express');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');

const { Logger } = require('../utils/logger');
const User = require('../models/User');
const Portfolio = require('../models/Portfolio');
const ProfileDetails = require('../models/ProfileDetails');
const Document = require('../models/Document');
const ShareCardToken = require('../models/ShareCardToken');
const { DOCUMENTS_DIR } = require('./documents');

const router = express.Router();

function sha256Hex(input) {
  return crypto.createHash('sha256').update(String(input)).digest('hex');
}

function isExpiredOrRevoked(tokenDoc) {
  const now = Date.now();
  const expiresAt = tokenDoc?.expiresAt ? new Date(tokenDoc.expiresAt).getTime() : 0;
  if (!expiresAt || expiresAt <= now) return true;
  if (tokenDoc?.revokedAt) return true;
  return false;
}

function escapeHtml(unsafe) {
  return String(unsafe ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function pickTruthySections(sections) {
  const s = sections && typeof sections === 'object' ? sections : {};
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
  const merged = { ...defaults, ...s };
  return merged;
}

async function resolveToken(token) {
  const raw = String(token || '').trim();
  if (!raw) return null;
  const tokenHash = sha256Hex(raw);
  const doc = await ShareCardToken.findOne({ tokenHash }).lean();
  if (!doc) return null;
  if (isExpiredOrRevoked(doc)) return { expired: true, tokenDoc: doc };
  return { expired: false, tokenDoc: doc };
}

async function buildSharePayload(tokenDoc, tokenRaw) {
  const ownerId = tokenDoc.owner;

  const [user, profileDetails, portfolio] = await Promise.all([
    User.findById(ownerId).select('username avatar bio socialLinks createdAt').lean(),
    ProfileDetails.findOne({ owner: ownerId }).lean(),
    Portfolio.findOne({ owner: ownerId }).lean(),
  ]);

  const sections = pickTruthySections(tokenDoc?.include?.sections);

  const allowedDocumentIds = Array.isArray(tokenDoc.allowedDocumentIds)
    ? tokenDoc.allowedDocumentIds.map((id) => String(id))
    : [];

  const documents = sections.documents && allowedDocumentIds.length
    ? await Document.find({
        _id: { $in: allowedDocumentIds },
        owner: ownerId,
        deletedAt: null,
      })
        .select('_id type label originalName mimeType extension sizeBytes createdAt')
        .lean()
    : [];

  const base = {
    token: {
      expiresAt: tokenDoc.expiresAt,
      include: {
        sections,
        fieldOverrides: tokenDoc?.include?.fieldOverrides || {},
      },
    },
    user: sections.identity ? {
      username: user?.username || '',
      avatar: user?.avatar || '/images/default-avatar.png',
      createdAt: user?.createdAt,
    } : null,
    profileDetails: {
      identity: sections.identity ? profileDetails?.identity || null : null,
      about: sections.about ? profileDetails?.about || null : null,
      careerIntent: sections.careerIntent ? profileDetails?.careerIntent || null : null,
      skills: sections.skills ? profileDetails?.skills || null : null,
      experience: sections.experience ? profileDetails?.experience || null : null,
      learning: sections.learning ? profileDetails?.learning || null : null,
      links: sections.links ? profileDetails?.links || null : null,
    },
    portfolio: sections.portfolio ? portfolio || null : null,
    documents: (documents || []).map((d) => ({
      id: String(d._id),
      type: d.type,
      label: d.label,
      originalName: d.originalName,
      mimeType: d.mimeType,
      extension: d.extension,
      sizeBytes: d.sizeBytes,
      createdAt: d.createdAt,
      downloadUrl: `/share/card/${encodeURIComponent(tokenRaw)}/download/${encodeURIComponent(String(d._id))}`,
    })),
  };

  // Backward compatibility: if ProfileDetails isn't filled, fall back to User.bio + socialLinks.
  if (!profileDetails) {
    base.profileDetails = {
      identity: sections.identity ? {
        displayName: '',
        headline: '',
        location: '',
        timezone: '',
        pronouns: '',
        languagesSpoken: [],
        contact: { publicEmail: '', publicPhone: '', preferredContactMethod: '' }
      } : null,
      about: sections.about ? { summaryShort: user?.bio || '', summaryLong: '', personalMission: '', values: [], strengths: [], growthAreas: [], workingStyle: {}, funFacts: [] } : null,
      careerIntent: sections.careerIntent ? null : null,
      skills: sections.skills ? null : null,
      experience: sections.experience ? null : null,
      learning: sections.learning ? null : null,
      links: sections.links ? {
        github: user?.socialLinks?.github || '',
        linkedin: user?.socialLinks?.linkedin || '',
        twitter: user?.socialLinks?.twitter || '',
        website: user?.socialLinks?.website || '',
        youtube: '',
        blog: '',
        other: []
      } : null,
    };
  }

  return base;
}

// Public share card HTML
router.get('/card/:token', async (req, res) => {
  const token = String(req.params.token || '').trim();
  if (!token) {
    return res.status(404).send('Not found');
  }

  // We still serve the shell even if expired; the JS will show the message.
  return res.sendFile(path.join(__dirname, '..', 'public', 'share-card.html'));
});

// Public share card JSON payload
router.get('/card/:token/data', async (req, res) => {
  try {
    const tokenRaw = String(req.params.token || '').trim();
    const resolved = await resolveToken(tokenRaw);
    if (!resolved) {
      return res.status(404).json({ error: 'invalid_or_expired' });
    }

    if (resolved.expired) {
      return res.status(410).json({ error: 'expired' });
    }

    const payload = await buildSharePayload(resolved.tokenDoc, tokenRaw);

    // Best-effort view tracking.
    ShareCardToken.updateOne(
      { _id: resolved.tokenDoc._id },
      { $inc: { viewCount: 1 }, $set: { lastViewedAt: new Date() } }
    ).catch(() => {});

    res.json(payload);
  } catch (error) {
    Logger.error('Share card payload failed', { error: error?.message });
    res.status(500).json({ error: 'server_error' });
  }
});

// Public token-gated download
router.get('/card/:token/download/:documentId', async (req, res) => {
  try {
    const tokenRaw = String(req.params.token || '').trim();
    const documentId = String(req.params.documentId || '').trim();

    const resolved = await resolveToken(tokenRaw);
    if (!resolved || resolved.expired) {
      return res.status(410).send('Link expired');
    }

    const tokenDoc = resolved.tokenDoc;
    const allowed = Array.isArray(tokenDoc.allowedDocumentIds)
      ? tokenDoc.allowedDocumentIds.map((id) => String(id))
      : [];

    if (!allowed.includes(documentId)) {
      return res.status(404).send('Not found');
    }

    const doc = await Document.findOne({ _id: documentId, owner: tokenDoc.owner, deletedAt: null })
      .select('storedName originalName mimeType');

    if (!doc) {
      return res.status(404).send('Not found');
    }

    const filePath = path.join(DOCUMENTS_DIR, doc.storedName);
    if (!fs.existsSync(filePath)) {
      return res.status(404).send('File missing');
    }

    // Always download (attachment) per requirement.
    res.setHeader('Content-Type', doc.mimeType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${escapeHtml(doc.originalName)}"`);

    return res.sendFile(filePath);
  } catch (error) {
    Logger.error('Share card download failed', { error: error?.message });
    return res.status(500).send('Failed to download');
  }
});

module.exports = router;
