/**
 * __tests__/rbac.test.js
 *
 * RBAC / permissions smoke tests.
 *
 * These tests create temporary non-superadmin users in the test DB,
 * validate expected 401/403/200/201 behavior on permission-gated endpoints,
 * and then clean up any created documents.
 */

const crypto = require('crypto');
const request = require('supertest');
const mongoose = require('mongoose');

const app = require('../app');
const User = require('../models/User');
const Role = require('../models/Role');
const Resource = require('../models/Resource');
const SiteContent = require('../models/SiteContent');
const { seedSystemRoles } = require('../utils/seedSystemRoles');

const assertStatus = (res, expectedStatus) => {
  if (res.status !== expectedStatus) {
    const body = (() => {
      try {
        return JSON.stringify(res.body);
      } catch {
        return String(res.text || '');
      }
    })();

    throw new Error(`Expected status ${expectedStatus}, got ${res.status}. body=${body}`);
  }
};

describe('RBAC / Permissions Smoke Tests', () => {
  const runId = crypto.randomBytes(8).toString('hex');

  const emailContent = `rbac_content_${runId}@example.com`;
  const emailDenied = `rbac_denied_${runId}@example.com`;
  const usernameContent = `rbac_content_${runId}`;
  const usernameDenied = `rbac_denied_${runId}`;
  const password = crypto.randomBytes(18).toString('base64url');

  const resourceUrl = `https://example.com/rbac-smoke/${runId}`;
  const siteSlug = `rbac-smoke-${runId}`;

  let createdUserIds = [];

  beforeAll(async () => {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/piqniq-test');

    await seedSystemRoles();

    const contentRole = await Role.findOne({ name: 'Content' }).select('_id isSystem').lean();
    if (!contentRole?._id) {
      throw new Error('Missing system role "Content"; seedSystemRoles did not create it.');
    }

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
    // Clean up only artifacts created by this test.
    await Resource.deleteMany({ url: resourceUrl });
    await SiteContent.deleteMany({ slug: siteSlug });

    if (createdUserIds.length) {
      await User.deleteMany({ _id: { $in: createdUserIds } });
    }

    // Fallback cleanup by email in case ids were not captured.
    await User.deleteMany({ email: { $in: [emailContent, emailDenied] } });

    await mongoose.connection.close();
  });

  it('enforces 401/403/200/201 across key RBAC endpoints', async () => {
    // 401: unauthenticated access to admin endpoint
    {
      const res = await request(app).get('/api/admin/users');
      assertStatus(res, 401);
    }

    // Denied user: can authenticate, but lacks permissions
    {
      const agent = request.agent(app);

      const loginRes = await agent
        .post('/api/auth/login')
        .send({ email: emailDenied, password });
      assertStatus(loginRes, 200);

      const contentWrite = await agent
        .put(`/api/site-content/${siteSlug}`)
        .send({ html: `<p>rbac smoke ${runId}</p>` });
      assertStatus(contentWrite, 403);

      const createResource = await agent
        .post('/api/resources/links')
        .send({
          title: `RBAC Smoke ${runId}`,
          url: resourceUrl,
          description: 'smoke',
          kind: 'documentation',
          level: 'all',
        });
      assertStatus(createResource, 403);

      const adminUsers = await agent.get('/api/admin/users');
      assertStatus(adminUsers, 403);
    }

    // Content user: has Content role permissions
    {
      const agent = request.agent(app);

      const loginRes = await agent
        .post('/api/auth/login')
        .send({ email: emailContent, password });
      assertStatus(loginRes, 200);

      const contentWrite = await agent
        .put(`/api/site-content/${siteSlug}`)
        .send({ html: `<p>rbac smoke ${runId}</p>` });
      assertStatus(contentWrite, 200);

      const createResource = await agent
        .post('/api/resources/links')
        .send({
          title: `RBAC Smoke ${runId}`,
          url: resourceUrl,
          description: 'smoke',
          kind: 'documentation',
          level: 'all',
        });
      assertStatus(createResource, 201);

      const adminUsers = await agent.get('/api/admin/users');
      assertStatus(adminUsers, 403);
    }
  });
});
