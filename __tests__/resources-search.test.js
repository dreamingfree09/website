/**
 * __tests__/resources-search.test.js
 *
 * Resources search integration tests.
 *
 * Validates that server-side search works (without relying on client filtering)
 * and that tag + search can be combined.
 */
const request = require('supertest');
const mongoose = require('mongoose');

const app = require('../app');
const Resource = require('../models/Resource');

describe('Resources search', () => {
  beforeAll(async () => {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/piqniq-test');

    await Resource.deleteMany({});

    await Resource.create([
      {
        key: 'link:https://www.cve.org/',
        title: 'CVE Program (CVE.org)',
        description: 'CVE program home and background.',
        kind: 'documentation',
        level: 'beginner',
        url: 'https://www.cve.org/',
        tags: ['cve', 'vuln-management'],
        isActive: true,
      },
      {
        key: 'link:https://nvd.nist.gov/',
        title: 'National Vulnerability Database (NVD)',
        description: 'NIST NVD search and vulnerability details.',
        kind: 'documentation',
        level: 'beginner',
        url: 'https://nvd.nist.gov/',
        tags: ['cve', 'nvd'],
        isActive: true,
      },
      {
        key: 'link:https://example.com/other',
        title: 'Totally Unrelated',
        description: 'Nothing to do with vulnerabilities.',
        kind: 'article',
        level: 'all',
        url: 'https://example.com/other',
        tags: ['misc'],
        isActive: true,
      },
    ]);
  });

  afterAll(async () => {
    await Resource.deleteMany({});
    await mongoose.connection.close();
  });

  it('GET /api/resources supports search=...', async () => {
    const res = await request(app)
      .get('/api/resources')
      .query({ search: 'cve' });

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.items)).toBe(true);

    const titles = res.body.items.map((r) => r.title);
    expect(titles).toEqual(expect.arrayContaining([
      'CVE Program (CVE.org)',
      'National Vulnerability Database (NVD)',
    ]));

    expect(titles).not.toEqual(expect.arrayContaining(['Totally Unrelated']));
  });

  it('GET /api/resources supports combining tag and search', async () => {
    const res = await request(app)
      .get('/api/resources')
      .query({ tag: 'cve', search: 'nist' });

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.items)).toBe(true);
    expect(res.body.items.length).toBeGreaterThan(0);

    const titles = res.body.items.map((r) => r.title);
    expect(titles).toEqual(['National Vulnerability Database (NVD)']);
  });
});
