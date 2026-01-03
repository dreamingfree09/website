/**
 * __tests__/study-api-extensions.test.js
 *
 * Integration tests for the newer Study Room capabilities:
 * - Templates + create-from-template
 * - Daily focus ("Next 3")
 * - Spaced review action
 * - Todo kinds
 */
const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../app');
const User = require('../models/User');
const { StudyWorkspace } = require('../models/StudyWorkspace');
const StudyFolder = require('../models/StudyFolder');
const { StudyItem } = require('../models/StudyItem');
const { StudyTodo } = require('../models/StudyTodo');

function dailyKeyUtc() {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, '0');
  const d = String(now.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

async function registerAndLogin(agent, { username, email, password }) {
  const registerRes = await agent
    .post('/api/auth/register')
    .send({ username, email, password });
  expect(registerRes.statusCode).toBe(201);

  const loginRes = await agent
    .post('/api/auth/login')
    .send({ email, password });
  expect(loginRes.statusCode).toBe(200);
}

describe('Study API extensions', () => {
  const createdEmails = [];

  beforeAll(async () => {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/piqniq-test');
  });

  afterAll(async () => {
    // Clean up only what we created to avoid cross-suite interference.
    if (createdEmails.length) {
      await User.deleteMany({ email: { $in: createdEmails } });
    }

    // Study collections are safe to clean up entirely in test DB.
    await StudyTodo.deleteMany({});
    await StudyItem.deleteMany({});
    await StudyFolder.deleteMany({});
    await StudyWorkspace.deleteMany({});

    await mongoose.connection.close();
  });

  it('requires auth for /api/study/templates and returns templates when signed in', async () => {
    const signedOutRes = await request(app).get('/api/study/templates');
    expect(signedOutRes.statusCode).toBe(401);

    const agent = request.agent(app);
    const suffix = Date.now();
    const username = `studyapi${suffix}`;
    const email = `studyapi${suffix}@example.com`;
    const password = 'StudyApi1234!';
    createdEmails.push(email);

    await registerAndLogin(agent, { username, email, password });

    const res = await agent.get('/api/study/templates');
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.items)).toBe(true);
    expect(res.body.items.length).toBeGreaterThan(0);
    expect(res.body.items[0]).toHaveProperty('id');
    expect(res.body.items[0]).toHaveProperty('title');
  });

  it('creates a workspace from template and seeds folders/items/todos', async () => {
    const agent = request.agent(app);
    const suffix = Date.now();
    const username = `studytempl${suffix}`;
    const email = `studytempl${suffix}@example.com`;
    const password = 'StudyTempl1234!';
    createdEmails.push(email);

    await registerAndLogin(agent, { username, email, password });

    const templatesRes = await agent.get('/api/study/templates');
    expect(templatesRes.statusCode).toBe(200);
    const templateId = templatesRes.body.items[0].id;

    const createRes = await agent
      .post('/api/study/workspaces/from-template')
      .send({ templateId });

    expect(createRes.statusCode).toBe(201);
    expect(createRes.body).toHaveProperty('workspace');
    expect(createRes.body.workspace).toHaveProperty('id');
    expect(createRes.body.workspace).toHaveProperty('mode');
    expect(createRes.body).toHaveProperty('seeded');
    expect(createRes.body.seeded.folders).toBeGreaterThan(0);

    const listRes = await agent.get('/api/study/workspaces');
    expect(listRes.statusCode).toBe(200);
    expect(Array.isArray(listRes.body.items)).toBe(true);
    expect(listRes.body.items.length).toBeGreaterThan(0);
  });

  it('supports daily focus (Next 3) with max 3 and validates refs', async () => {
    const agent = request.agent(app);
    const suffix = Date.now();
    const username = `studyfocus${suffix}`;
    const email = `studyfocus${suffix}@example.com`;
    const password = 'StudyFocus1234!';
    createdEmails.push(email);

    await registerAndLogin(agent, { username, email, password });

    const wsRes = await agent
      .post('/api/study/workspaces')
      .send({ title: 'Focus WS', emoji: '🎯' });
    expect(wsRes.statusCode).toBe(201);
    const workspaceId = wsRes.body.workspace.id;

    const itemRes = await agent
      .post('/api/study/items')
      .send({ workspaceId, type: 'note', title: 'Focus Item', note: 'hello', status: 'active' });
    expect(itemRes.statusCode).toBe(201);
    const itemId = itemRes.body.item.id;

    const todoRes = await agent
      .post('/api/study/todos')
      .send({ workspaceId, text: 'Focus Todo', kind: 'task' });
    expect(todoRes.statusCode).toBe(201);
    const todoId = todoRes.body.todo.id;

    const patchRes = await agent
      .patch(`/api/study/workspaces/${encodeURIComponent(workspaceId)}`)
      .send({
        focus: [
          { kind: 'item', refId: itemId },
          { kind: 'todo', refId: todoId },
        ]
      });
    expect(patchRes.statusCode).toBe(200);
    expect(patchRes.body.workspace.focusDateKey).toBe(dailyKeyUtc());
    expect(Array.isArray(patchRes.body.workspace.focus)).toBe(true);
    expect(patchRes.body.workspace.focus.length).toBe(2);

    // Too many
    const tooManyRes = await agent
      .patch(`/api/study/workspaces/${encodeURIComponent(workspaceId)}`)
      .send({
        focus: [
          { kind: 'item', refId: itemId },
          { kind: 'todo', refId: todoId },
          { kind: 'item', refId: itemId },
          { kind: 'todo', refId: todoId },
        ]
      });
    expect(tooManyRes.statusCode).toBe(400);

    // Invalid ref should fail
    const badRefRes = await agent
      .patch(`/api/study/workspaces/${encodeURIComponent(workspaceId)}`)
      .send({ focus: [{ kind: 'item', refId: '000000000000000000000000' }] });
    expect(badRefRes.statusCode).toBe(400);
  });

  it('marks item as reviewed and advances its review stage over time', async () => {
    const agent = request.agent(app);
    const suffix = Date.now();
    const username = `studyreview${suffix}`;
    const email = `studyreview${suffix}@example.com`;
    const password = 'StudyReview1234!';
    createdEmails.push(email);

    await registerAndLogin(agent, { username, email, password });

    const wsRes = await agent
      .post('/api/study/workspaces')
      .send({ title: 'Review WS', emoji: '🧠' });
    expect(wsRes.statusCode).toBe(201);
    const workspaceId = wsRes.body.workspace.id;

    const itemRes = await agent
      .post('/api/study/items')
      .send({ workspaceId, type: 'note', title: 'Review Me', note: 'note', status: 'active', reviewEnabled: true });
    expect(itemRes.statusCode).toBe(201);
    const itemId = itemRes.body.item.id;

    const r1 = await agent.post(`/api/study/items/${encodeURIComponent(itemId)}/review`);
    expect(r1.statusCode).toBe(200);
    expect(r1.body.item.reviewEnabled).toBe(true);
    expect(typeof r1.body.item.reviewStage).toBe('number');
    expect(r1.body.item.lastReviewedAt).toBeTruthy();
    expect(r1.body.item.nextReviewAt).toBeTruthy();

    const next1 = new Date(r1.body.item.nextReviewAt).getTime();

    const r2 = await agent.post(`/api/study/items/${encodeURIComponent(itemId)}/review`);
    expect(r2.statusCode).toBe(200);
    const next2 = new Date(r2.body.item.nextReviewAt).getTime();

    // Second review should schedule further into the future.
    expect(next2).toBeGreaterThan(next1);
  });

  it('persists todo kind on create and update', async () => {
    const agent = request.agent(app);
    const suffix = Date.now();
    const username = `studytodo${suffix}`;
    const email = `studytodo${suffix}@example.com`;
    const password = 'StudyTodo1234!';
    createdEmails.push(email);

    await registerAndLogin(agent, { username, email, password });

    const wsRes = await agent
      .post('/api/study/workspaces')
      .send({ title: 'Todo WS', emoji: '🧾' });
    expect(wsRes.statusCode).toBe(201);
    const workspaceId = wsRes.body.workspace.id;

    const todoRes = await agent
      .post('/api/study/todos')
      .send({ workspaceId, text: 'Make flashcards', kind: 'flashcards' });
    expect(todoRes.statusCode).toBe(201);
    expect(todoRes.body.todo.kind).toBe('flashcards');

    const todoId = todoRes.body.todo.id;

    const patchRes = await agent
      .patch(`/api/study/todos/${encodeURIComponent(todoId)}`)
      .send({ kind: 'project' });
    expect(patchRes.statusCode).toBe(200);
    expect(patchRes.body.todo.kind).toBe('project');

    const listRes = await agent
      .get(`/api/study/todos?workspaceId=${encodeURIComponent(workspaceId)}`);
    expect(listRes.statusCode).toBe(200);
    const found = (listRes.body.items || []).find((t) => String(t._id || t.id) === String(todoId));
    expect(found).toBeTruthy();
    expect(found.kind).toBe('project');
  });
});
