/**
 * routes/tags.js
 *
 * Curated tags API.
 *
 * - Public can list active tags
 * - Staff can manage tags (create/update/disable) via permission gating
 */
const express = require('express');
const router = express.Router();

const Tag = require('../models/Tag');
const { requirePermission } = require('../middleware/permissions');
const { PERMISSIONS } = require('../utils/permissionsCatalog');

const slugify = (input) => {
  const s = String(input || '').trim().toLowerCase();
  return s
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
};

// Public: list active tags
router.get('/', async (req, res) => {
  try {
    const category = String(req.query?.category || '').trim();
    const q = { isActive: true };
    if (category) q.category = category;

    // Performance: tags are public and change rarely.
    // Cache briefly in production; avoid caching during development.
    if ((process.env.NODE_ENV || 'development') === 'production') {
      res.setHeader('Cache-Control', 'public, max-age=300, stale-while-revalidate=900');
    } else {
      res.setHeader('Cache-Control', 'no-store');
    }

    const tags = await Tag.find(q)
      .select('name slug category description')
      .sort({ category: 1, name: 1 })
      .lean();

    return res.json({ tags });
  } catch {
    return res.status(500).json({ error: 'Server error' });
  }
});

// Admin: list all tags (including inactive)
router.get('/admin', requirePermission(PERMISSIONS.TAGS_MANAGE), async (req, res) => {
  try {
    const category = String(req.query?.category || '').trim();
    const q = {};
    if (category) q.category = category;

    const tags = await Tag.find(q)
      .select('name slug category description isActive isSystem createdAt updatedAt')
      .sort({ category: 1, name: 1 });

    return res.json({ tags });
  } catch {
    return res.status(500).json({ error: 'Server error' });
  }
});

// Admin-curated: create/update/delete tags
router.post('/', requirePermission(PERMISSIONS.TAGS_MANAGE), async (req, res) => {
  try {
    const name = String(req.body?.name || '').trim();
    const category = String(req.body?.category || 'general').trim() || 'general';
    const description = String(req.body?.description || '').trim();
    const slug = String(req.body?.slug || slugify(name)).trim().toLowerCase();

    if (!name) return res.status(400).json({ error: 'Tag name is required' });
    if (!slug) return res.status(400).json({ error: 'Tag slug is required' });

    const tag = await Tag.create({
      name,
      category,
      description,
      slug,
      isActive: true,
      isSystem: true,
    });

    return res.status(201).json({ tag });
  } catch (error) {
    if (String(error?.code) === '11000') {
      return res.status(400).json({ error: 'Tag slug already exists' });
    }
    return res.status(500).json({ error: 'Error creating tag' });
  }
});

router.put('/:id', requirePermission(PERMISSIONS.TAGS_MANAGE), async (req, res) => {
  try {
    const tag = await Tag.findById(req.params.id);
    if (!tag) return res.status(404).json({ error: 'Tag not found' });

    if (req.body?.name !== undefined) tag.name = String(req.body.name || '').trim();
    if (req.body?.category !== undefined) tag.category = String(req.body.category || '').trim() || 'general';
    if (req.body?.description !== undefined) tag.description = String(req.body.description || '').trim();
    if (req.body?.isActive !== undefined) tag.isActive = Boolean(req.body.isActive);

    // Slug is part of the public contract; allow changing but keep it safe.
    if (req.body?.slug !== undefined) {
      tag.slug = String(req.body.slug || '').trim().toLowerCase();
    }

    await tag.save();
    return res.json({ tag });
  } catch (error) {
    if (String(error?.code) === '11000') {
      return res.status(400).json({ error: 'Tag slug already exists' });
    }
    return res.status(500).json({ error: 'Error updating tag' });
  }
});

router.delete('/:id', requirePermission(PERMISSIONS.TAGS_MANAGE), async (req, res) => {
  try {
    const tag = await Tag.findByIdAndDelete(req.params.id);
    if (!tag) return res.status(404).json({ error: 'Tag not found' });
    return res.json({ message: 'Tag deleted' });
  } catch {
    return res.status(500).json({ error: 'Error deleting tag' });
  }
});

module.exports = router;
