/**
 * routes/chatGifs.js
 *
 * Proxy endpoints for fetching GIF search results from an upstream API.
 *
 * Keeps the API key server-side (if used) and avoids exposing it to the browser.
 */
const express = require('express');
const https = require('https');

const { isAuthenticated } = require('../middleware/auth');

const router = express.Router();

function httpGetJson(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        let body = '';
        res.on('data', (chunk) => {
          body += chunk;
        });
        res.on('end', () => {
          try {
            const json = JSON.parse(body || '{}');
            resolve({ statusCode: res.statusCode || 0, json });
          } catch (error) {
            reject(new Error('Invalid JSON from upstream'));
          }
        });
      })
      .on('error', (err) => reject(err));
  });
}

function pickGifUrls(result) {
  const mf = result?.media_formats || {};

  const preview = mf?.tinygif?.url || mf?.nanogif?.url || mf?.gif?.url || null;
  const url = mf?.gif?.url || mf?.mediumgif?.url || mf?.tinygif?.url || preview;

  if (!url) return null;

  return {
    url,
    previewUrl: preview || url,
    width: mf?.tinygif?.dims?.[0] || mf?.gif?.dims?.[0] || null,
    height: mf?.tinygif?.dims?.[1] || mf?.gif?.dims?.[1] || null
  };
}

async function fetchTenorV2({ endpoint, params }) {
  const apiKey = process.env.TENOR_API_KEY || '';
  if (!apiKey) {
    return { error: { status: 501, message: 'GIF search is not configured. Set TENOR_API_KEY on the server.' } };
  }

  const url = new URL(`https://tenor.googleapis.com/v2/${endpoint}`);
  url.searchParams.set('key', apiKey);
  url.searchParams.set('media_filter', 'gif,tinygif,nanogif');
  url.searchParams.set('contentfilter', 'medium');

  for (const [k, v] of Object.entries(params || {})) {
    url.searchParams.set(k, String(v));
  }

  const { statusCode, json } = await httpGetJson(url.toString());
  if (statusCode < 200 || statusCode >= 300) {
    return { error: { status: 502, message: 'GIF search upstream error.' } };
  }

  const raw = Array.isArray(json?.results) ? json.results : [];
  const results = raw
    .map((r) => {
      const picked = pickGifUrls(r);
      if (!picked) return null;
      return {
        id: String(r?.id || ''),
        title: String(r?.title || ''),
        ...picked
      };
    })
    .filter(Boolean);

  return { results };
}

// GET /api/chat/gifs/trending?limit=24
router.get('/gifs/trending', isAuthenticated, async (req, res) => {
  const limitRaw = Number.parseInt(String(req.query?.limit || '24'), 10);
  const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(24, limitRaw)) : 24;

  try {
    // Tenor v2 supports /featured for a trending-like feed.
    const out = await fetchTenorV2({ endpoint: 'featured', params: { limit } });
    if (out.error) {
      return res.status(out.error.status).json({ message: out.error.message });
    }
    return res.json({ results: out.results });
  } catch {
    return res.status(500).json({ message: 'Failed to load trending GIFs.' });
  }
});

// GET /api/chat/gifs/search?q=cat&limit=24
router.get('/gifs/search', isAuthenticated, async (req, res) => {
  const q = String(req.query?.q || '').trim();
  const limitRaw = Number.parseInt(String(req.query?.limit || '24'), 10);
  const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(24, limitRaw)) : 24;

  if (!q) {
    return res.json({ results: [] });
  }

  if (q.length > 80) {
    return res.status(400).json({ message: 'Query too long.' });
  }

  try {
    const out = await fetchTenorV2({ endpoint: 'search', params: { q, limit } });
    if (out.error) {
      return res.status(out.error.status).json({ message: out.error.message });
    }
    return res.json({ results: out.results });
  } catch {
    return res.status(500).json({ message: 'Failed to search GIFs.' });
  }
});

module.exports = router;
