/**
 * __tests__/pages.test.js
 *
 * Page + routing smoke tests.
 *
 * Confirms that key page shells render and that “friendly URL” routes are
 * wired up to the same HTML.
 */
const request = require('supertest');
const app = require('../app');

describe('Page + headers smoke tests', () => {
  it('GET /dashboard.html serves dashboard page', async () => {
    const res = await request(app).get('/dashboard.html');
    expect(res.statusCode).toBe(200);
    expect(res.text).toContain('id="dashboardContainer"');
  });

  it('GET /profile.html serves profile page', async () => {
    const res = await request(app).get('/profile.html');
    expect(res.statusCode).toBe(200);
    expect(res.text).toContain('id="profileContainer"');
  });

  it('GET /profile/dashboard serves dashboard page (friendly URL)', async () => {
    const res = await request(app).get('/profile/dashboard');
    expect(res.statusCode).toBe(200);
    expect(res.text).toContain('id="dashboardContainer"');
  });

  it('GET /profile/:username serves profile page shell (friendly URL)', async () => {
    const res = await request(app).get('/profile/someuser');
    expect(res.statusCode).toBe(200);
    expect(res.text).toContain('id="profileContainer"');
  });

  it('GET /post/:id redirects to /forum.html?post=...', async () => {
    const res = await request(app).get('/post/507f1f77bcf86cd799439011');
    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toBe('/forum.html?post=507f1f77bcf86cd799439011');
  });

  it('GET /forum.html serves forum page and contains Create Post button', async () => {
    const res = await request(app).get('/forum.html');
    expect(res.statusCode).toBe(200);
    expect(res.text).toContain('id="createPostBtn"');
    expect(res.text).toContain('id="createPostModal"');
    expect(res.text).toContain('id="createPostForm"');
  });

  it('GET /forum serves forum page', async () => {
    const res = await request(app).get('/forum');
    expect(res.statusCode).toBe(200);
  });

  it('GET /pathways.html serves pathways page and contains pathwaysContent container', async () => {
    const res = await request(app).get('/pathways.html');
    expect(res.statusCode).toBe(200);
    expect(res.text).toContain('id="pathwaysContent"');
  });

  it('GET /pathways serves pathways page (friendly URL)', async () => {
    const res = await request(app).get('/pathways');
    expect(res.statusCode).toBe(200);
    expect(res.text).toContain('id="pathwaysContent"');
  });

  it('GET /resources.html serves resources page and contains resourcesList container', async () => {
    const res = await request(app).get('/resources.html');
    expect(res.statusCode).toBe(200);
    expect(res.text).toContain('id="resourcesList"');
    expect(res.text).toContain('id="tagFilter"');
  });

  it('GET /resources serves resources page (friendly URL)', async () => {
    const res = await request(app).get('/resources');
    expect(res.statusCode).toBe(200);
    expect(res.text).toContain('id="resourcesList"');
  });

  it('GET /portfolio serves portfolio page (friendly URL)', async () => {
    const res = await request(app).get('/portfolio');
    expect(res.statusCode).toBe(200);
    expect(res.text).toContain('id="portfolioApp"');
  });

  it('GET /portfolio/:username serves portfolio page shell (friendly URL)', async () => {
    const res = await request(app).get('/portfolio/someuser');
    expect(res.statusCode).toBe(200);
    expect(res.text).toContain('id="portfolioApp"');
  });

  it('GET /api/system/health responds UP', async () => {
    const res = await request(app).get('/api/system/health');
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('status', 'UP');
    expect(res.body).toHaveProperty('database');
    expect(res.body).toHaveProperty('stats');
    expect(res.body.stats).toHaveProperty('users');
    expect(res.body.stats).toHaveProperty('posts');
  });

  it('GET /api/portfolio/showcase responds with items array', async () => {
    const res = await request(app).get('/api/portfolio/showcase');
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('items');
    expect(Array.isArray(res.body.items)).toBe(true);
  });

  it('CSP does not include upgrade-insecure-requests (prevents localhost sign-in breakage)', async () => {
    const res = await request(app).get('/api/system/health');
    const csp = res.headers['content-security-policy'] || '';
    expect(csp).not.toMatch(/upgrade-insecure-requests/i);
  });
});
