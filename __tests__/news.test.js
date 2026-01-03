/**
 * __tests__/news.test.js
 *
 * Ensures /api/news responds with a stable shape.
 * Network is mocked: we do not hit real RSS sources in tests.
 */
const request = require('supertest');
const app = require('../app');

const makeRss = ({ title = 'Feed', itemTitle = 'Hello', link = 'https://example.com/a', pubDate = 'Tue, 02 Jan 2026 10:00:00 GMT' } = {}) => `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${title}</title>
    <item>
      <title>${itemTitle}</title>
      <link>${link}</link>
      <pubDate>${pubDate}</pubDate>
      <description>Short summary</description>
      <guid>${link}</guid>
    </item>
  </channel>
</rss>`;

describe('News API', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    process.env.NEWS_CACHE_TTL_MS = '0';
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('GET /api/news returns items array', async () => {
    global.fetch = jest.fn(async () => ({
      ok: true,
      status: 200,
      arrayBuffer: async () => Buffer.from(makeRss(), 'utf8'),
    }));

    const res = await request(app).get('/api/news?limit=3');

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('items');
    expect(Array.isArray(res.body.items)).toBe(true);
    expect(res.body).toHaveProperty('sources');
    expect(Array.isArray(res.body.sources)).toBe(true);

    if (res.body.items.length) {
      const item = res.body.items[0];
      expect(item).toHaveProperty('title');
      expect(item).toHaveProperty('url');
      expect(item).toHaveProperty('source');
    }
  });

  it('GET /api/news tolerates upstream failures', async () => {
    let call = 0;
    global.fetch = jest.fn(async () => {
      call += 1;
      if (call % 2 === 0) throw new Error('network down');
      return {
        ok: true,
        status: 200,
        arrayBuffer: async () => Buffer.from(makeRss({ itemTitle: `Item ${call}` }), 'utf8'),
      };
    });

    const res = await request(app).get('/api/news?limit=6');
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('items');
    expect(Array.isArray(res.body.items)).toBe(true);
    // Should not hard-fail even if some feeds error.
  });
});
