/**
 * __tests__/study-room-pages.test.js
 *
 * Regression tests for page-level auth gating.
 *
 * Ensures /study.html cannot be accessed by guests via the static file server
 * (route-order bypass prevention), and that authenticated users get the page.
 */
const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../app');
const User = require('../models/User');
const fs = require('fs');
const path = require('path');

describe('Study Room page auth gate', () => {
  const createdUsers = [];

  beforeAll(async () => {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/piqniq-test');
  });

  afterAll(async () => {
    if (createdUsers.length) {
      await User.deleteMany({ email: { $in: createdUsers } });
    }
    await mongoose.connection.close();
  });

  it('GET /study.html redirects to sign-in when signed out', async () => {
    const res = await request(app).get('/study.html');
    expect(res.statusCode).toBe(302);
    expect(res.headers.location || '').toMatch(/^\/\?auth=required&next=/);
    expect(res.headers.location || '').toContain(encodeURIComponent('/study.html'));
  });

  it('GET /study.html serves page when authenticated', async () => {
    const agent = request.agent(app);

    const suffix = Date.now();
    const username = `study${suffix}`;
    const email = `study${suffix}@example.com`;
    const password = 'Study1234!';

    createdUsers.push(email);

    const registerRes = await agent
      .post('/api/auth/register')
      .send({ username, email, password });
    expect(registerRes.statusCode).toBe(201);

    const loginRes = await agent
      .post('/api/auth/login')
      .send({ email, password });
    expect(loginRes.statusCode).toBe(200);

    const res = await agent.get('/study.html');
    expect(res.statusCode).toBe(200);
    expect(res.text).toContain('id="studyContainer"');

    // UI wiring smoke checks.
    // The Focus+Review section is rendered client-side (not server HTML),
    // so we assert the page includes the client bundle and the bundle contains
    // the key enhancement container IDs.
    expect(res.text).toContain('<script src="/js/study.js"></script>');

    const studyClientPath = path.join(__dirname, '..', 'public', 'js', 'study.js');
    const studyClient = fs.readFileSync(studyClientPath, 'utf8');
    expect(studyClient).toContain('id="studyEnhancements"');
    expect(studyClient).toContain('id="studyFocusList"');
    expect(studyClient).toContain('id="studyReviewList"');
  });
});
