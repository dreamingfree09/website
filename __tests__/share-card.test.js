/**
 * __tests__/share-card.test.js
 *
 * Smoke tests for the share-card + documents flow:
 * - Authenticated users can upload and download their documents.
 * - Users can create expiring share-card links with selected documents.
 * - Public share-card endpoints return data and allow token-gated downloads.
 */
const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../app');

const User = require('../models/User');
const Document = require('../models/Document');
const ShareCardToken = require('../models/ShareCardToken');

describe('Share Card + Documents', () => {
  let agent;
  let uploadedDocumentId;
  let shareToken;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/piqniq-test');
    }

    agent = request.agent(app);

    const suffix = Date.now();
    const username = `sharecard${suffix}`;
    const email = `sharecard${suffix}@example.com`;
    const password = 'Sharecard1234!';

    const registerRes = await agent
      .post('/api/auth/register')
      .send({ username, email, password });

    expect(registerRes.statusCode).toBe(201);

    const loginRes = await agent
      .post('/api/auth/login')
      .send({ email, password });

    expect(loginRes.statusCode).toBe(200);
  });

  afterAll(async () => {
    await ShareCardToken.deleteMany({});
    await Document.deleteMany({});
    await User.deleteMany({});
    await mongoose.connection.close();
  });

  it('uploads, lists, and owner-downloads a document', async () => {
    const uploadRes = await agent
      .post('/api/documents')
      .field('type', 'CV')
      .field('label', 'My CV')
      .attach('file', Buffer.from('hello world', 'utf8'), 'cv.txt');

    expect(uploadRes.statusCode).toBe(201);
    expect(uploadRes.body).toHaveProperty('document');
    uploadedDocumentId = uploadRes.body.document.id;

    const listRes = await agent.get('/api/documents');
    expect(listRes.statusCode).toBe(200);
    expect(Array.isArray(listRes.body.items)).toBe(true);
    expect(listRes.body.items.some((d) => String(d._id) === String(uploadedDocumentId))).toBe(true);

    const dlRes = await agent.get(`/api/documents/${encodeURIComponent(uploadedDocumentId)}/download`);
    expect(dlRes.statusCode).toBe(200);
    expect(String(dlRes.headers['content-disposition'] || '')).toMatch(/attachment/i);
    expect(dlRes.text).toContain('hello world');
  });

  it('creates a share card and allows token-gated downloads', async () => {
    const createRes = await agent
      .post('/api/share-card')
      .send({
        expiresInDays: 30,
        include: {
          sections: {
            identity: true,
            about: true,
            careerIntent: true,
            skills: true,
            experience: true,
            learning: true,
            portfolio: true,
            links: true,
            documents: true,
          }
        },
        allowedDocumentIds: [uploadedDocumentId]
      });

    expect(createRes.statusCode).toBe(201);
    expect(createRes.body).toHaveProperty('url');

    const url = createRes.body.url;
    shareToken = String(url).split('/share/card/')[1];
    expect(shareToken).toBeTruthy();

    const dataRes = await request(app).get(`/share/card/${encodeURIComponent(shareToken)}/data`);
    expect(dataRes.statusCode).toBe(200);
    expect(dataRes.body).toHaveProperty('documents');

    const docItems = dataRes.body.documents || [];
    expect(Array.isArray(docItems)).toBe(true);
    expect(docItems.some((d) => String(d.id) === String(uploadedDocumentId))).toBe(true);

    const publicDlRes = await request(app)
      .get(`/share/card/${encodeURIComponent(shareToken)}/download/${encodeURIComponent(uploadedDocumentId)}`);

    expect(publicDlRes.statusCode).toBe(200);
    expect(String(publicDlRes.headers['content-disposition'] || '')).toMatch(/attachment/i);
  });
});
