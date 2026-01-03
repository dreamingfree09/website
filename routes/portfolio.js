/**
 * routes/portfolio.js
 *
 * User portfolio API.
 *
 * Endpoints:
 * - GET/PUT /api/portfolio/me (authenticated owner editing)
 * - GET /api/portfolio/:username (public if portfolio is public; owner can view private)
 * - GET /api/portfolio/showcase (public feed of recent public portfolios)
 *
 * Security:
 * - URLs are normalized and restricted to http(s) to prevent javascript: links.
 */
const express = require('express');
const router = express.Router();
const validator = require('validator');

const User = require('../models/User');
const Portfolio = require('../models/Portfolio');
const PortfolioInvite = require('../models/PortfolioInvite');
const { isAuthenticated } = require('../middleware/auth');
const crypto = require('crypto');

const normalizeStringArray = (value, { maxItems, maxLen }) => {
  const arr = Array.isArray(value) ? value : [];
  return arr
    .map((s) => String(s || '').trim())
    .filter(Boolean)
    .slice(0, maxItems)
    .map((s) => s.slice(0, maxLen));
};

const normalizeUrl = (value) => {
  const v = String(value || '').trim();
  if (!v) return '';
  // Only allow http(s) URLs.
  if (!validator.isURL(v, { require_protocol: true, protocols: ['http', 'https'] })) {
    return '';
  }
  return v.slice(0, 500);
};

const normalizeProject = (project) => {
  const title = String(project?.title || '').trim().slice(0, 120);
  const description = String(project?.description || '').trim().slice(0, 2000);

  return {
    title,
    description,
    demoUrl: normalizeUrl(project?.demoUrl),
    repoUrl: normalizeUrl(project?.repoUrl),
    tags: normalizeStringArray(project?.tags, { maxItems: 10, maxLen: 30 }),
  };
};

const normalizePortfolioPayload = (payload) => {
  const headline = String(payload?.headline || '').trim().slice(0, 120);
  const bio = String(payload?.bio || '').trim().slice(0, 2000);
  const skills = normalizeStringArray(payload?.skills, { maxItems: 30, maxLen: 30 });

  const projectsRaw = Array.isArray(payload?.projects) ? payload.projects : [];
  const projects = projectsRaw
    .slice(0, 20)
    .map(normalizeProject)
    .filter((p) => p.title || p.description || p.demoUrl || p.repoUrl || (p.tags && p.tags.length));

  const isPublic = payload?.isPublic === undefined ? true : Boolean(payload.isPublic);

  return { headline, bio, skills, projects, isPublic };
};

// Get or create the current user's portfolio
router.get('/me', isAuthenticated, async (req, res) => {
  try {
    const ownerId = req.session.userId;

    const owner = await User.findById(ownerId).select('isSuperAdmin');
    const defaultIsPublic = owner?.isSuperAdmin ? false : true;

    const portfolio = await Portfolio.findOneAndUpdate(
      { owner: ownerId },
      { $setOnInsert: { owner: ownerId, isPublic: defaultIsPublic } },
      { new: true, upsert: true }
    );

    res.json({ portfolio });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Update the current user's portfolio
router.put('/me', isAuthenticated, async (req, res) => {
  try {
    const ownerId = req.session.userId;
    const updates = normalizePortfolioPayload(req.body);

    const portfolio = await Portfolio.findOneAndUpdate(
      { owner: ownerId },
      { $set: updates, $setOnInsert: { owner: ownerId } },
      { new: true, upsert: true, runValidators: true }
    );

    res.json({ portfolio });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Public showcase feed (public portfolios)
router.get('/showcase', async (req, res) => {
  try {
    // Product change: personal portfolios are invite-only.
    // Keep endpoint for backward compatibility with older clients/tests.
    res.json({ items: [] });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

const hashToken = (token) => {
  const t = String(token || '').trim();
  if (!t) return '';
  return crypto.createHash('sha256').update(t).digest('hex');
};

// Create invite token for the current user's portfolio
router.post('/invites', isAuthenticated, async (req, res) => {
  try {
    const ownerId = req.session.userId;

    const hoursRaw = Number(req.body?.expiresInHours);
    const expiresInHours = Number.isFinite(hoursRaw) ? Math.min(Math.max(hoursRaw, 1), 24 * 30) : 24 * 7;
    const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);

    const token = crypto.randomBytes(24).toString('hex');
    const tokenHash = hashToken(token);
    const tokenLast4 = token.slice(-4);

    const invite = await PortfolioInvite.create({
      owner: ownerId,
      tokenHash,
      tokenLast4,
      expiresAt,
      createdBy: ownerId,
    });

    res.status(201).json({
      invite: {
        id: String(invite._id),
        token,
        tokenLast4,
        expiresAt,
        createdAt: invite.createdAt,
      }
    });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

// List invite tokens for the current user's portfolio (masked)
router.get('/invites', isAuthenticated, async (req, res) => {
  try {
    const ownerId = req.session.userId;
    const invites = await PortfolioInvite.find({ owner: ownerId })
      .sort({ createdAt: -1 })
      .select('tokenLast4 expiresAt revokedAt createdAt')
      .lean();

    res.json({
      items: (invites || []).map((i) => ({
        id: String(i._id),
        tokenLast4: i.tokenLast4,
        expiresAt: i.expiresAt,
        revokedAt: i.revokedAt,
        createdAt: i.createdAt,
      }))
    });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Revoke invite token
router.delete('/invites/:id', isAuthenticated, async (req, res) => {
  try {
    const ownerId = req.session.userId;
    const id = String(req.params.id || '').trim();
    if (!id) return res.status(400).json({ error: 'Missing id' });

    const invite = await PortfolioInvite.findOne({ _id: id, owner: ownerId });
    if (!invite) return res.status(404).json({ error: 'Not found' });

    invite.revokedAt = new Date();
    await invite.save();
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Public portfolio by username (only if public)
router.get('/:username', async (req, res) => {
  try {
    const username = String(req.params.username || '').trim();
    if (!username) {
      return res.status(400).json({ error: 'Username is required' });
    }

    // Case-insensitive username match
    const user = await User.findOne({ username })
      .collation({ locale: 'en', strength: 2 })
      .select('username avatar isSuperAdmin');

    if (!user) {
      return res.status(404).json({ error: 'Portfolio not found' });
    }

    const portfolio = await Portfolio.findOne({ owner: user._id }).lean();

    const requesterId = req.session?.userId ? String(req.session.userId) : null;
    const isOwner = requesterId && String(user._id) === requesterId;

    // Product change: personal portfolios are invite-only.
    // - Owner can always view
    // - Everyone else must provide a valid invite token
    if (!isOwner) {
      const token = String(req.query?.token || '').trim();
      const tokenHash = hashToken(token);
      if (!tokenHash) {
        return res.status(404).json({ error: 'Portfolio not found' });
      }

      const invite = await PortfolioInvite.findOne({ owner: user._id, tokenHash, revokedAt: null });
      if (!invite) {
        return res.status(404).json({ error: 'Portfolio not found' });
      }

      if (invite.expiresAt && new Date(invite.expiresAt).getTime() < Date.now()) {
        return res.status(404).json({ error: 'Portfolio not found' });
      }
    }

    if (!portfolio) {
      return res.status(404).json({ error: 'Portfolio not found' });
    }

    // Ignore isPublic for non-owners; invite token is the only access mechanism.

    res.json({
      user: {
        username: user.username,
        avatar: user.avatar,
      },
      portfolio,
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
