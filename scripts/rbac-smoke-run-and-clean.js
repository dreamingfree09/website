/**
 * scripts/rbac-smoke-run-and-clean.js
 *
 * Creates temporary RBAC test users in the configured MongoDB database,
 * runs a small permission smoke test via supertest (no real HTTP server),
 * then cleans up the created users and related documents.
 *
 * This script is designed to be safe to run repeatedly.
 *
 * Usage:
 *   node scripts/rbac-smoke-run-and-clean.js
 *
 * Optional env vars:
 *   MONGODB_URI=mongodb://localhost:27017/piqniq-test
 */

require('dotenv').config();

// Ensure the imported app runs in "test runtime" mode:
// - no rate limiting
// - no connect-mongo session store
process.env.NODE_ENV = 'test';

const crypto = require('crypto');
const request = require('supertest');
const mongoose = require('mongoose');

const app = require('../app');
const User = require('../models/User');
const Role = require('../models/Role');
const Resource = require('../models/Resource');
const SiteContent = require('../models/SiteContent');
const { seedSystemRoles } = require('../utils/seedSystemRoles');

const runId = crypto.randomBytes(8).toString('hex');

const emailContent = `rbac_content_${runId}@example.com`;
const emailDenied = `rbac_denied_${runId}@example.com`;
const usernameContent = `rbac_content_${runId}`;
const usernameDenied = `rbac_denied_${runId}`;

const password = crypto.randomBytes(18).toString('base64url');

const resourceUrl = `https://example.com/rbac-smoke/${runId}`;
const siteSlug = `rbac-smoke-${runId}`;

const assertStatus = (res, expectedStatus, label) => {
  if (res.status !== expectedStatus) {
    const body = (() => {
      try {
        return JSON.stringify(res.body);
      } catch {
        return String(res.text || '');
      }
    })();

    const err = new Error(`${label}: expected ${expectedStatus}, got ${res.status}. body=${body}`);
    err.response = res;
    throw err;
  }
};

const main = async () => {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/piqniq-test';
  let createdUserIds = [];

  try {
    await mongoose.connect(mongoUri);

    await seedSystemRoles();
    const contentRole = await Role.findOne({ name: 'Content' }).select('_id isSystem').lean();
    if (!contentRole?._id) {
      throw new Error('Missing system role "Content"; seedSystemRoles did not create it.');
    }

    // Create two dummy users directly (keeps this independent from register flows).
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

    // 401 check: unauthenticated admin endpoint
    {
      const res = await request(app).get('/api/admin/users');
      assertStatus(res, 401, 'Unauthenticated GET /api/admin/users');
    }

    // Login as denied user
    const deniedAgent = request.agent(app);
    {
      const loginRes = await deniedAgent
        .post('/api/auth/login')
        .send({ email: emailDenied, password });
      assertStatus(loginRes, 200, 'Denied user login');

      const res1 = await deniedAgent
        .put(`/api/site-content/${siteSlug}`)
        .send({ html: `<p>rbac smoke ${runId}</p>` });
      assertStatus(res1, 403, 'Denied user PUT /api/site-content/:slug');

      const res2 = await deniedAgent
        .post('/api/resources/links')
        .send({ title: `RBAC Smoke ${runId}`, url: resourceUrl, description: 'smoke', kind: 'documentation', level: 'all' });
      assertStatus(res2, 403, 'Denied user POST /api/resources/links');

      const res3 = await deniedAgent.get('/api/admin/users');
      assertStatus(res3, 403, 'Denied user GET /api/admin/users');
    }

    // Login as content user
    const contentAgent = request.agent(app);
    {
      const loginRes = await contentAgent
        .post('/api/auth/login')
        .send({ email: emailContent, password });
      assertStatus(loginRes, 200, 'Content user login');

      const res1 = await contentAgent
        .put(`/api/site-content/${siteSlug}`)
        .send({ html: `<p>rbac smoke ${runId}</p>` });
      assertStatus(res1, 200, 'Content user PUT /api/site-content/:slug');

      const res2 = await contentAgent
        .post('/api/resources/links')
        .send({ title: `RBAC Smoke ${runId}`, url: resourceUrl, description: 'smoke', kind: 'documentation', level: 'all' });
      assertStatus(res2, 201, 'Content user POST /api/resources/links');

      const res3 = await contentAgent.get('/api/admin/users');
      assertStatus(res3, 403, 'Content user GET /api/admin/users');
    }

    console.log(JSON.stringify({
      ok: true,
      mongoUri,
      runId,
      createdUsers: [emailContent, emailDenied],
      verifiedChecks: [
        'unauthenticated admin endpoint -> 401',
        'denied user content write -> 403',
        'content user content write -> 200',
        'denied user resource create -> 403',
        'content user resource create -> 201',
        'content/denied user admin users -> 403',
      ],
    }, null, 2));
  } finally {
    // Cleanup: delete only documents created in this run.
    try {
      await Resource.deleteMany({ url: resourceUrl });
    } catch {}

    try {
      await SiteContent.deleteMany({ slug: siteSlug });
    } catch {}

    try {
      if (createdUserIds.length) {
        await User.deleteMany({ _id: { $in: createdUserIds } });
      }
      // Also delete by email as a fallback in case ids were not recorded.
      await User.deleteMany({ email: { $in: [emailContent, emailDenied] } });
    } catch {}

    try {
      await mongoose.connection.close();
    } catch {}
  }
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
