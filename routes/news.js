/**
 * routes/news.js
 *
 * Aggregates “main tech news” from an allowlist of reliable RSS/Atom sources.
 *
 * Security + privacy notes:
 * - Uses a strict allowlist to prevent SSRF (no arbitrary URLs).
 * - Applies timeouts and max response sizes to avoid resource exhaustion.
 * - Returns plain JSON; the client renders via textContent to avoid XSS.
 */
const express = require('express');
const Parser = require('rss-parser');

const router = express.Router();

// Node 18+ has global fetch; Node 14/16 do not. We support both.
// Important: we resolve fetch at call time so tests can set global.fetch after app boot.
let undiciFetch;
const getFetch = () => {
  if (typeof global.fetch === 'function') return global.fetch;
  if (!undiciFetch) {
    // eslint-disable-next-line global-require
    undiciFetch = require('undici').fetch;
  }
  return undiciFetch;
};

const NEWS_SOURCES = [
  { id: 'github-blog', name: 'GitHub Blog', url: 'https://github.blog/feed/' },
  { id: 'google-security', name: 'Google Security Blog', url: 'https://security.googleblog.com/feeds/posts/default?alt=rss' },
  { id: 'cloudflare', name: 'Cloudflare Blog', url: 'https://blog.cloudflare.com/rss/' },
  { id: 'kubernetes', name: 'Kubernetes Blog', url: 'https://kubernetes.io/feed.xml' },
  { id: 'aws-blog', name: 'AWS News Blog', url: 'https://aws.amazon.com/blogs/aws/feed/' },
];

const clampInt = (value, { min, max, fallback }) => {
  const n = Number.parseInt(String(value ?? ''), 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
};

const toHttpUrlOrEmpty = (value) => {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  try {
    const u = new URL(raw);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return '';
    return u.toString();
  } catch {
    return '';
  }
};

const safeText = (value, maxLen = 240) => {
  const text = String(value ?? '').replace(/\s+/g, ' ').trim();
  if (!text) return '';
  return text.length > maxLen ? `${text.slice(0, maxLen - 1)}…` : text;
};

const parsePublishedMs = (item) => {
  const candidates = [item?.isoDate, item?.pubDate, item?.published, item?.updated];
  for (const c of candidates) {
    const ms = Date.parse(String(c || ''));
    if (!Number.isNaN(ms)) return ms;
  }
  return 0;
};

const makeCache = () => {
  let state = { expiresAt: 0, payload: null };
  return {
    get: () => (Date.now() < state.expiresAt ? state.payload : null),
    set: (payload, ttlMs) => {
      state = {
        expiresAt: Date.now() + Math.max(0, ttlMs),
        payload,
      };
    },
    clear: () => {
      state = { expiresAt: 0, payload: null };
    },
  };
};

const cache = makeCache();

const parser = new Parser({
  timeout: clampInt(process.env.NEWS_FETCH_TIMEOUT_MS, { min: 1000, max: 20000, fallback: 7000 }),
  customFields: {
    item: ['source', 'published', 'updated'],
  },
});

const fetchFeedText = async (url, { timeoutMs, maxBytes }) => {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const resp = await getFetch()(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9, */*;q=0.1',
        'User-Agent': 'PiqniqNewsBot/1.0 (+https://localhost)',
      },
      redirect: 'follow',
      signal: controller.signal,
    });

    if (!resp.ok) {
      throw new Error(`Upstream status ${resp.status}`);
    }

    const buf = Buffer.from(await resp.arrayBuffer());
    if (buf.length > maxBytes) {
      throw new Error(`Upstream body too large (${buf.length} bytes)`);
    }

    return buf.toString('utf8');
  } finally {
    clearTimeout(t);
  }
};

const aggregateNews = async ({ limit }) => {
  const ttlMs = clampInt(process.env.NEWS_CACHE_TTL_MS, { min: 15_000, max: 60 * 60 * 1000, fallback: 10 * 60 * 1000 });
  const timeoutMs = clampInt(process.env.NEWS_FETCH_TIMEOUT_MS, { min: 1000, max: 20000, fallback: 7000 });
  const maxBytes = clampInt(process.env.NEWS_MAX_BYTES, { min: 50_000, max: 2_000_000, fallback: 750_000 });

  const cached = cache.get();
  if (cached) return cached.slice(0, limit);

  const results = await Promise.allSettled(
    NEWS_SOURCES.map(async (src) => {
      const feedText = await fetchFeedText(src.url, { timeoutMs, maxBytes });
      const feed = await parser.parseString(feedText);
      const items = Array.isArray(feed?.items) ? feed.items : [];

      return items.map((item) => {
        const publishedMs = parsePublishedMs(item);
        const link = toHttpUrlOrEmpty(item?.link) || toHttpUrlOrEmpty(item?.guid) || '';

        return {
          id: safeText(item?.guid || item?.id || link || `${src.id}:${safeText(item?.title, 80)}`, 120),
          title: safeText(item?.title, 120) || 'Tech news',
          summary: safeText(item?.contentSnippet || item?.summary || item?.content, 220),
          url: link,
          source: src.name,
          sourceId: src.id,
          publishedAt: publishedMs ? new Date(publishedMs).toISOString() : '',
          publishedMs,
        };
      });
    })
  );

  const merged = [];
  for (const r of results) {
    if (r.status !== 'fulfilled') continue;
    merged.push(...(r.value || []));
  }

  // Drop entries with no URL (can’t navigate) and dedupe by URL.
  const seen = new Set();
  const deduped = merged.filter((item) => {
    if (!item?.url) return false;
    if (seen.has(item.url)) return false;
    seen.add(item.url);
    return true;
  });

  deduped.sort((a, b) => (b.publishedMs || 0) - (a.publishedMs || 0));

  // Cache the full sorted list (trim served list per-request).
  cache.set(deduped, ttlMs);
  return deduped.slice(0, limit);
};

router.get('/', async (req, res) => {
  try {
    const limit = clampInt(req.query.limit, { min: 1, max: 12, fallback: 6 });
    const items = await aggregateNews({ limit });

    // Cache client-side briefly to reduce bursts.
    res.setHeader('Cache-Control', 'public, max-age=60');
    res.json({
      items,
      sources: NEWS_SOURCES.map(({ id, name, url }) => ({ id, name, url })),
    });
  } catch (e) {
    res.status(200).json({
      items: [],
      sources: NEWS_SOURCES.map(({ id, name, url }) => ({ id, name, url })),
      error: 'NEWS_UNAVAILABLE',
    });
  }
});

module.exports = router;
