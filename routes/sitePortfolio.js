/**
 * routes/sitePortfolio.js
 *
 * Site-wide portfolio (staff curated).
 *
 * Public:
 * - GET /api/site-portfolio
 *
 * Staff (Content role and above):
 * - POST /api/site-portfolio
 * - PATCH /api/site-portfolio/:id
 * - DELETE /api/site-portfolio/:id
 */
const express = require('express');
const validator = require('validator');
const router = express.Router();

const SitePortfolioItem = require('../models/SitePortfolioItem');
const { requirePermission } = require('../middleware/permissions');
const { PERMISSIONS } = require('../utils/permissionsCatalog');

const normalizeUrl = (value) => {
  const v = String(value || '').trim();
  if (!v) return '';
  if (!validator.isURL(v, { require_protocol: true, protocols: ['http', 'https'] })) return '';
  return v.slice(0, 500);
};

const normalizeTags = (value) => {
  const raw = Array.isArray(value) ? value : [];
  return raw
    .map((t) => String(t || '').trim())
    .filter(Boolean)
    .slice(0, 20)
    .map((t) => t.slice(0, 30));
};

const normalizePayload = (body) => {
  const title = String(body?.title || '').trim().slice(0, 140);
  const summary = String(body?.summary || '').trim().slice(0, 2000);
  const linkUrl = normalizeUrl(body?.linkUrl);
  const imageUrl = normalizeUrl(body?.imageUrl);
  const tags = normalizeTags(body?.tags);
  const isActive = body?.isActive === undefined ? true : Boolean(body.isActive);
  const sortOrderRaw = Number(body?.sortOrder);
  const sortOrder = Number.isFinite(sortOrderRaw) ? sortOrderRaw : 0;

  return { title, summary, linkUrl, imageUrl, tags, isActive, sortOrder };
};

// Public list
router.get('/', async (req, res) => {
  try {
    const limitRaw = Number.parseInt(String(req.query.limit || '50'), 10);
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 100) : 50;

    const items = await SitePortfolioItem.find({ isActive: true })
      .sort({ sortOrder: 1, updatedAt: -1 })
      .limit(limit)
      .select('title summary linkUrl imageUrl tags updatedAt')
      .lean();

    res.json({ items: items || [] });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Staff create
router.post('/', requirePermission(PERMISSIONS.SITE_PORTFOLIO_MANAGE), async (req, res) => {
  try {
    const payload = normalizePayload(req.body);
    if (!payload.title) return res.status(400).json({ error: 'title is required' });

    const created = await SitePortfolioItem.create({
      ...payload,
      createdBy: req.session.userId,
      updatedBy: req.session.userId,
    });

    res.status(201).json({ item: created });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Staff update
router.patch('/:id', requirePermission(PERMISSIONS.SITE_PORTFOLIO_MANAGE), async (req, res) => {
  try {
    const id = String(req.params.id || '').trim();
    if (!id) return res.status(400).json({ error: 'Missing id' });

    const payload = normalizePayload(req.body);
    if (!payload.title) return res.status(400).json({ error: 'title is required' });

    const updated = await SitePortfolioItem.findByIdAndUpdate(
      id,
      { $set: { ...payload, updatedBy: req.session.userId } },
      { new: true, runValidators: true }
    );

    if (!updated) return res.status(404).json({ error: 'Not found' });

    res.json({ item: updated });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Staff delete
router.delete('/:id', requirePermission(PERMISSIONS.SITE_PORTFOLIO_MANAGE), async (req, res) => {
  try {
    const id = String(req.params.id || '').trim();
    if (!id) return res.status(400).json({ error: 'Missing id' });

    const deleted = await SitePortfolioItem.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ error: 'Not found' });

    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
