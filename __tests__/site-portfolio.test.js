/**
 * __tests__/site-portfolio.test.js
 *
 * Site-wide portfolio (staff curated) API tests.
 *
 * - Public can GET /api/site-portfolio
 * - Only users with SITE_PORTFOLIO_MANAGE can create items
 */
const request = require('supertest');
const mongoose = require('mongoose');
const crypto = require('crypto');

const app = require('../app');
const User = require('../models/User');
const Role = require('../models/Role');
const SitePortfolioItem = require('../models/SitePortfolioItem');
const { seedSystemRoles } = require('../utils/seedSystemRoles');

describe('Site portfolio API', () => {
  const runId = crypto.randomBytes(6).toString('hex');

  const password = crypto.randomBytes(18).toString('base64url');
  const emailContent = `site_portfolio_content_${runId}@example.com`;
  const emailDenied = `site_portfolio_denied_${runId}@example.com`;
  const usernameContent = `sp_content_${runId}`;
  const usernameDenied = `sp_denied_${runId}`;

  let createdUserIds = [];
  let createdItemIds = [];

  beforeAll(async () => {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/piqniq-test');

    await seedSystemRoles();

    const contentRole = await Role.findOne({ name: 'Content' }).select('_id').lean();
    if (!contentRole?._id) throw new Error('Missing system role "Content"');

    const uContent = await User.create({
      email: emailContent,
      username: usernameContent,
      password,
      isEmailVerified: true,
      role: 'member',
      roles: [contentRole._id],
      isSuperAdmin: false,
    });

    const uDenied = await User.create({
      email: emailDenied,
      username: usernameDenied,
      password,
      isEmailVerified: true,
      role: 'member',
      roles: [],
      isSuperAdmin: false,
    });

    createdUserIds = [uContent._id, uDenied._id];
  });

  afterAll(async () => {
    if (createdItemIds.length) {
      await SitePortfolioItem.deleteMany({ _id: { $in: createdItemIds } });
    }

    if (createdUserIds.length) {
      await User.deleteMany({ _id: { $in: createdUserIds } });
    }

    await User.deleteMany({ email: { $in: [emailContent, emailDenied] } });

    await mongoose.connection.close();
  });

  it('public GET /api/site-portfolio returns items array', async () => {
    const res = await request(app).get('/api/site-portfolio');
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.items)).toBe(true);
  });

  it('enforces permissions for creating site portfolio items', async () => {
    const payload = {
      title: `Site Portfolio ${runId}`,
      summary: 'Curated item',
      linkUrl: 'https://example.com',
      tags: ['test'],
      isActive: true,
      sortOrder: 0,
    };

    // Denied user: 403
    {
      const agentDenied = request.agent(app);
      await agentDenied.post('/api/auth/login').send({ email: emailDenied, password }).expect(200);
      const res = await agentDenied.post('/api/site-portfolio').send(payload);
      expect(res.statusCode).toBe(403);
    }

    // Content user: 201
    {
      const agentContent = request.agent(app);
      await agentContent.post('/api/auth/login').send({ email: emailContent, password }).expect(200);
      const res = await agentContent.post('/api/site-portfolio').send(payload);
      expect(res.statusCode).toBe(201);
      expect(res.body?.item?.title).toBe(payload.title);
      if (res.body?.item?._id) createdItemIds.push(res.body.item._id);
    }

    // Public list should include the created item
    {
      const res = await request(app).get('/api/site-portfolio?limit=100');
      expect(res.statusCode).toBe(200);
      const titles = (res.body.items || []).map((i) => i.title);
      expect(titles).toContain(payload.title);
    }
  });
});
