/**
 * routes/siteContent.js
 *
 * Site content API for staff-maintained pages.
 *
 * Current usage:
 * - Publicly-readable Pathways content (`slug=pathways`)
 * - Writable only by users with `pathways:manage` permission (Content role and above)
 */
const express = require('express');
const router = express.Router();

const SiteContent = require('../models/SiteContent');
const { requirePermission } = require('../middleware/permissions');
const { PERMISSIONS } = require('../utils/permissionsCatalog');

const normalizeSlug = (value) => String(value || '').trim().toLowerCase();

const stripLegacyPathwaysHtmlForRender = (html) => {
  const input = String(html || '');
  if (!input) return '';

  // Keep this intentionally simple and dependency-free (no HTML parser).
  // We only strip known legacy sections that conflict with the new Role Explorer UX.
  const patterns = [
    /<section[^>]*class=["'][^"']*\bpathways-hero\b[^"']*["'][^>]*>[\s\S]*?<\/section>/gi,
    /<section[^>]*class=["'][^"']*\bpathways-intro\b[^"']*["'][^>]*>[\s\S]*?<\/section>/gi,
    /<section[^>]*class=["'][^"']*\bpathways-grid\b[^"']*["'][^>]*>[\s\S]*?<\/section>/gi,
    /<section[^>]*class=["'][^"']*\bgetting-started\b[^"']*["'][^>]*>[\s\S]*?<\/section>/gi,
  ];

  let out = input;
  for (const re of patterns) out = out.replace(re, '');
  return out.trim();
};

// Public: get active site content by slug
router.get('/:slug', async (req, res) => {
  try {
    const slug = normalizeSlug(req.params.slug);
    if (!slug) return res.status(400).json({ error: 'Missing slug' });

    const doc = await SiteContent.findOne({ slug, isActive: true }).select('slug html updatedAt');
    if (!doc) return res.status(404).json({ error: 'Not found' });

    const isRenderMode = String(req.query?.render || '') === '1';
    const html = isRenderMode && slug === 'pathways'
      ? stripLegacyPathwaysHtmlForRender(doc.html)
      : doc.html;

    res.json({
      content: {
        slug: doc.slug,
        html,
        updatedAt: doc.updatedAt,
      },
    });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Staff: upsert site content by slug (Content role and above)
router.put('/:slug', requirePermission(PERMISSIONS.PATHWAYS_MANAGE), async (req, res) => {
  try {
    const slug = normalizeSlug(req.params.slug);
    if (!slug) return res.status(400).json({ error: 'Missing slug' });

    const html = String(req.body?.html ?? '').trim();
    if (!html) return res.status(400).json({ error: 'html is required' });

    const updated = await SiteContent.findOneAndUpdate(
      { slug },
      {
        $set: {
          slug,
          html,
          isActive: true,
          updatedBy: req.session?.userId || null,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).select('slug html updatedAt');

    res.json({ content: updated });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
