/**
 * routes/search.js
 *
 * Unified public search endpoint.
 *
 * Why:
 * - Avoids the slow pattern of fetching all records and filtering on the client.
 * - Uses MongoDB text indexes for scalable search across posts and resources.
 *
 * GET /api/search?q=...&type=all|posts|resources&limit=10
 */
const express = require('express');
const router = express.Router();

const Post = require('../models/Post');
const Resource = require('../models/Resource');

const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const clampInt = (value, { min, max, fallback }) => {
  const n = Number.parseInt(String(value ?? ''), 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
};

router.get('/', async (req, res) => {
  try {
    const q = String(req.query?.q || '').trim();
    const typeRaw = String(req.query?.type || 'all').trim().toLowerCase();
    const limit = clampInt(req.query?.limit, { min: 1, max: 25, fallback: 10 });

    const includePosts = typeRaw === 'all' || typeRaw === 'posts';
    const includeResources = typeRaw === 'all' || typeRaw === 'resources';

    if (q.length < 2) {
      return res.json({ q, posts: [], resources: [] });
    }

    const tryTextSearch = async () => {
      const [posts, resources] = await Promise.all([
        includePosts
          ? Post.find(
            { $text: { $search: q }, deletedAt: null },
            { score: { $meta: 'textScore' } }
          )
            .select('title content category author createdAt voteScore views likes replies')
            .populate('author', 'username avatar reputation')
            .sort({ score: { $meta: 'textScore' }, createdAt: -1 })
            .limit(limit)
            .lean()
          : Promise.resolve([]),

        includeResources
          ? Resource.find(
            { $text: { $search: q }, isActive: true },
            { score: { $meta: 'textScore' } }
          )
            .select('title description kind level url fileUrl fileOriginalName tags createdAt updatedAt')
            .sort({ score: { $meta: 'textScore' }, createdAt: -1 })
            .limit(limit)
            .lean()
          : Promise.resolve([]),
      ]);

      return { posts, resources };
    };

    const tryRegexSearch = async () => {
      const rx = new RegExp(escapeRegex(q), 'i');
      const [posts, resources] = await Promise.all([
        includePosts
          ? Post.find({
            deletedAt: null,
            $or: [{ title: rx }, { content: rx }, { category: rx }],
          })
            .select('title content category author createdAt voteScore views likes replies')
            .populate('author', 'username avatar reputation')
            .sort({ createdAt: -1 })
            .limit(limit)
            .lean()
          : Promise.resolve([]),

        includeResources
          ? Resource.find({
            isActive: true,
            $or: [{ title: rx }, { description: rx }, { url: rx }, { fileOriginalName: rx }, { tags: rx }],
          })
            .select('title description kind level url fileUrl fileOriginalName tags createdAt updatedAt')
            .sort({ createdAt: -1 })
            .limit(limit)
            .lean()
          : Promise.resolve([]),
      ]);

      return { posts, resources };
    };

    let posts = [];
    let resources = [];
    try {
      const result = await tryTextSearch();
      posts = result.posts;
      resources = result.resources;
    } catch (e) {
      const msg = String(e?.message || '').toLowerCase();
      // If indexes aren't ready yet, fall back to regex so search still works.
      if (!msg.includes('text index required')) throw e;
      const result = await tryRegexSearch();
      posts = result.posts;
      resources = result.resources;
    }

    // Keep the payload tight and stable for UI consumption.
    const normalizedPosts = (posts || []).map((p) => ({
      _id: p._id,
      title: p.title,
      content: p.content,
      category: p.category,
      createdAt: p.createdAt,
      voteScore: p.voteScore || 0,
      views: p.views || 0,
      likesCount: Array.isArray(p.likes) ? p.likes.length : 0,
      repliesCount: Array.isArray(p.replies) ? p.replies.length : 0,
      author: p.author ? {
        _id: p.author._id,
        username: p.author.username,
        avatar: p.author.avatar,
        reputation: p.author.reputation,
      } : null,
    }));

    return res.json({
      q,
      posts: normalizedPosts,
      resources: resources || [],
    });
  } catch (e) {
    return res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
