/**
 * __tests__/auth.test.js
 *
 * Auth API integration tests.
 *
 * Uses supertest against the Express app and a MongoDB test database.
 * These tests verify registration/login behaviors and basic validation.
 */
const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../app');
const User = require('../models/User');

describe('Auth API Tests', () => {
  beforeAll(async () => {
    // Connect to test database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/piqniq-test');
  });

  afterAll(async () => {
    // Clean up and disconnect
    await User.deleteMany({});
    await mongoose.connection.close();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'testuser',
          email: 'test@example.com',
          password: 'Test1234!'
        });

      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty('message', 'Registration successful');
    });

    it('should reject duplicate username', async () => {
      await request(app)
        .post('/api/auth/register')
        .send({
          username: 'duplicate',
          email: 'duplicate1@example.com',
          password: 'Test1234!'
        });

      const res = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'duplicate',
          email: 'duplicate2@example.com',
          password: 'Test1234!'
        });

      expect(res.statusCode).toBe(400);
    });

    it('should reject weak passwords', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'weakpass',
          email: 'weak@example.com',
          password: 'weak'
        });

      expect(res.statusCode).toBe(400);
    });
  });

  describe('POST /api/auth/login', () => {
    beforeAll(async () => {
      await request(app)
        .post('/api/auth/register')
        .send({
          username: 'logintest',
          email: 'login@example.com',
          password: 'Login1234!'
        });
    });

    it('should login with correct credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'login@example.com',
          password: 'Login1234!'
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.user).toHaveProperty('username', 'logintest');
    });

    it('should keep session and allow /api/auth/me after login', async () => {
      const agent = request.agent(app);

      const suffix = Date.now();
      const username = `mecheck${suffix}`;
      const email = `mecheck${suffix}@example.com`;
      const password = 'Mecheck1234!';

      // Ensure user exists
      const registerRes = await agent
        .post('/api/auth/register')
        .send({
          username,
          email,
          password
        });

      expect(registerRes.statusCode).toBe(201);

      const loginRes = await agent
        .post('/api/auth/login')
        .send({
          email,
          password
        });

      expect(loginRes.statusCode).toBe(200);

      const meRes = await agent.get('/api/auth/me');
      expect(meRes.statusCode).toBe(200);
      expect(meRes.body).toHaveProperty('user');
      expect(meRes.body.user).toHaveProperty('username', username);
    });

    it('should reject wrong password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'login@example.com',
          password: 'WrongPassword123!'
        });

      expect(res.statusCode).toBe(401);
    });

    it('should reject non-existent user', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'Password123!'
        });

      expect(res.statusCode).toBe(401);
    });
  });
});
