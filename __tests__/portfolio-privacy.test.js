/**
 * __tests__/portfolio-privacy.test.js
 *
 * Privacy hardening tests for portfolio visibility.
 *
 * - Superadmin portfolios must never appear in the public showcase
 * - Superadmin portfolio API must not be accessible to guests
 */
const request = require('supertest');
const mongoose = require('mongoose');

const app = require('../app');
const User = require('../models/User');
const Portfolio = require('../models/Portfolio');

describe('Portfolio privacy hardening', () => {
  let superadminUser;

  beforeAll(async () => {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/piqniq-test');

    const suffix = Date.now();
    const username = `superadmin_${suffix}`;
    const email = `superadmin_${suffix}@example.com`;

    // Create via API so it matches real user setup.
    await request(app)
      .post('/api/auth/register')
      .send({ username, email, password: 'Super1234!' })
      .expect(201);

    superadminUser = await User.findOne({ email }).select('_id username isSuperAdmin');
    superadminUser.isSuperAdmin = true;
    await superadminUser.save();

    // Create a public portfolio in the DB to ensure it would otherwise show up.
    await Portfolio.findOneAndUpdate(
      { owner: superadminUser._id },
      {
        $set: {
          owner: superadminUser._id,
          isPublic: true,
          headline: 'Hidden Superadmin Portfolio',
          bio: 'Should not be publicly visible',
          skills: ['security'],
          projects: [],
        }
      },
      { new: true, upsert: true, runValidators: true }
    );
  });

  afterAll(async () => {
    if (superadminUser?._id) {
      await Portfolio.deleteMany({ owner: superadminUser._id });
      await User.deleteMany({ _id: superadminUser._id });
    }
    await mongoose.connection.close();
  });

  it('GET /api/portfolio/showcase returns an empty list (personal portfolios are invite-only)', async () => {
    const res = await request(app).get('/api/portfolio/showcase?limit=50');
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.items)).toBe(true);
    expect(res.body.items.length).toBe(0);
  });

  it('GET /api/portfolio/:username returns 404 for superadmin when signed out', async () => {
    const res = await request(app).get(`/api/portfolio/${encodeURIComponent(superadminUser.username)}`);
    expect([404]).toContain(res.statusCode);
  });
});
