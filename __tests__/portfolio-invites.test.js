/**
 * __tests__/portfolio-invites.test.js
 *
 * Personal portfolios are invite-only.
 *
 * - Signed-out viewers cannot fetch a portfolio by username
 * - Owner can generate invite tokens
 * - Valid token allows viewing
 * - Revoked/expired tokens deny viewing
 */
const request = require('supertest');
const mongoose = require('mongoose');
const crypto = require('crypto');

const app = require('../app');
const User = require('../models/User');
const Portfolio = require('../models/Portfolio');
const PortfolioInvite = require('../models/PortfolioInvite');

describe('Portfolio invite-only access', () => {
  const runId = crypto.randomBytes(6).toString('hex');
  const username = `invite_owner_${runId}`;
  const email = `invite_owner_${runId}@example.com`;
  const password = 'Invite1234!';

  let ownerId;
  let agent;

  beforeAll(async () => {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/piqniq-test');

    agent = request.agent(app);

    await agent
      .post('/api/auth/register')
      .send({ username, email, password })
      .expect(201);

    await agent
      .post('/api/auth/login')
      .send({ email, password })
      .expect(200);

    const u = await User.findOne({ email }).select('_id');
    ownerId = u?._id;

    await Portfolio.findOneAndUpdate(
      { owner: ownerId },
      {
        $set: {
          owner: ownerId,
          // Even if true, access is still invite-only after the product change.
          isPublic: true,
          headline: 'Invite Only',
          bio: 'Should require token',
          skills: ['test'],
          projects: [],
        },
      },
      { new: true, upsert: true, runValidators: true }
    );
  });

  afterAll(async () => {
    if (ownerId) {
      await PortfolioInvite.deleteMany({ owner: ownerId });
      await Portfolio.deleteMany({ owner: ownerId });
      await User.deleteMany({ _id: ownerId });
    }
    await mongoose.connection.close();
  });

  it('denies signed-out portfolio fetch without token', async () => {
    const res = await request(app).get(`/api/portfolio/${encodeURIComponent(username)}`);
    expect(res.statusCode).toBe(404);
  });

  it('allows viewing with a valid invite token', async () => {
    const createRes = await agent.post('/api/portfolio/invites').send({});
    expect(createRes.statusCode).toBe(201);
    expect(createRes.body?.invite?.token).toBeTruthy();

    const token = createRes.body.invite.token;

    const viewRes = await request(app).get(
      `/api/portfolio/${encodeURIComponent(username)}?token=${encodeURIComponent(token)}`
    );

    expect(viewRes.statusCode).toBe(200);
    expect(viewRes.body?.user?.username).toBe(username);
  });

  it('denies viewing with a revoked token', async () => {
    const createRes = await agent.post('/api/portfolio/invites').send({});
    expect(createRes.statusCode).toBe(201);

    const token = createRes.body.invite.token;
    const inviteId = createRes.body.invite.id;

    const revokeRes = await agent.delete(`/api/portfolio/invites/${encodeURIComponent(inviteId)}`);
    expect(revokeRes.statusCode).toBe(200);

    const viewRes = await request(app).get(
      `/api/portfolio/${encodeURIComponent(username)}?token=${encodeURIComponent(token)}`
    );

    expect(viewRes.statusCode).toBe(404);
  });

  it('denies viewing with an expired token', async () => {
    // Create a token then force-expire it in DB.
    const createRes = await agent.post('/api/portfolio/invites').send({});
    expect(createRes.statusCode).toBe(201);

    const token = createRes.body.invite.token;

    await PortfolioInvite.updateOne(
      { owner: ownerId, tokenLast4: createRes.body.invite.tokenLast4 },
      { $set: { expiresAt: new Date(Date.now() - 1000) } }
    );

    const viewRes = await request(app).get(
      `/api/portfolio/${encodeURIComponent(username)}?token=${encodeURIComponent(token)}`
    );

    expect(viewRes.statusCode).toBe(404);
  });
});
