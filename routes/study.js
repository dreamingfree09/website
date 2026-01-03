/**
 * routes/study.js
 *
 * Study Room API (personal workspaces)
 *
 * Security model:
 * - Everything is private and scoped to req.session.userId
 * - All reads/writes enforce owner checks server-side (deny-by-default)
 * - Resource and Document references are validated for existence/ownership
 */
const express = require('express');

const { isAuthenticated } = require('../middleware/auth');
const { Logger } = require('../utils/logger');

const { StudyWorkspace, STUDY_WORKSPACE_MODES, dailyKeyUtc } = require('../models/StudyWorkspace');
const StudyFolder = require('../models/StudyFolder');
const { StudyItem, STUDY_ITEM_STATUS, STUDY_ITEM_TYPES, STUDY_ITEM_MASTERY } = require('../models/StudyItem');
const { StudyTodo, STUDY_TODO_KIND } = require('../models/StudyTodo');

const Resource = require('../models/Resource');
const Document = require('../models/Document');

const router = express.Router();

const asObjectIdString = (value) => String(value || '').trim();

const normalizeText = (value, maxLen) => String(value || '').trim().slice(0, maxLen);

const normalizeTags = (value) => {
  const arr = Array.isArray(value) ? value : [];
  return Array.from(
    new Set(arr.map((v) => String(v || '').trim().toLowerCase()).filter(Boolean))
  ).slice(0, 20);
};

const parseOptionalDate = (value) => {
  if (value === undefined || value === null || value === '') return null;
  const d = new Date(value);
  return Number.isFinite(d.getTime()) ? d : null;
};

const bumpWorkspaceActivity = async (ownerId, workspaceId, { xpDelta }) => {
  const today = dailyKeyUtc();

  const ws = await StudyWorkspace.findOne({ _id: workspaceId, owner: ownerId }).select(
    '_id xp level streakCount lastActivityDateKey'
  );
  if (!ws) return null;

  const prevKey = String(ws.lastActivityDateKey || '').trim();
  let streak = Number(ws.streakCount || 0);

  if (!prevKey) {
    streak = 1;
  } else if (prevKey === today) {
    // no change
  } else {
    // Compare day difference in UTC
    const prev = new Date(`${prevKey}T00:00:00.000Z`);
    const cur = new Date(`${today}T00:00:00.000Z`);
    const diffDays = Math.round((cur.getTime() - prev.getTime()) / (24 * 60 * 60 * 1000));
    streak = diffDays === 1 ? (streak + 1) : 1;
  }

  const xpNext = Math.max(0, Number(ws.xp || 0) + Math.max(0, Number(xpDelta || 0)));
  const levelNext = Math.max(1, Math.floor(xpNext / 100) + 1);

  ws.xp = xpNext;
  ws.level = levelNext;
  ws.streakCount = streak;
  ws.lastActivityDateKey = today;
  await ws.save();

  return { xp: ws.xp, level: ws.level, streakCount: ws.streakCount, lastActivityDateKey: ws.lastActivityDateKey };
};

const templates = [
  {
    id: 'nodejs-foundations',
    title: 'Node.js Foundations',
    emoji: '🟢',
    goal: 'Build core Node.js + Express skills and ship a small API project.',
    folders: ['Basics', 'Express', 'MongoDB', 'Project'],
    items: [
      { type: 'note', title: 'Learning checklist', note: '✅ Understand event loop\n✅ Write an Express route\n✅ Connect MongoDB\n✅ Deploy', tags: ['plan'] },
      { type: 'link', title: 'Express Guide', url: 'https://expressjs.com/', tags: ['docs'] },
    ],
    todos: [
      { text: 'Build a CRUD API with validation', kind: 'project', priority: 'high' },
      { text: 'Write 10 flashcards (HTTP status codes)', kind: 'flashcards', priority: 'normal' },
      { text: 'Do 20min practice (routing + middleware)', kind: 'practice', priority: 'normal' },
    ]
  },
  {
    id: 'dsa-interview',
    title: 'DSA Interview Prep',
    emoji: '🧠',
    goal: 'Practice patterns, review mistakes, and build confidence for interviews.',
    folders: ['Arrays', 'Strings', 'Trees', 'Graphs'],
    items: [
      { type: 'note', title: 'Pattern list', note: 'Sliding window\nTwo pointers\nMonotonic stack\nBFS/DFS', tags: ['patterns'] },
      { type: 'link', title: 'Big-O Cheatsheet', url: 'https://www.bigocheatsheet.com/', tags: ['reference'] },
    ],
    todos: [
      { text: 'Solve 3 problems (1 easy, 1 medium, 1 stretch)', kind: 'practice', priority: 'high' },
      { text: 'Write flashcards for today’s mistakes', kind: 'flashcards', priority: 'normal' },
      { text: 'Do a 30min mock interview', kind: 'quiz', priority: 'high' },
    ]
  }
];

async function ensureWorkspaceOwned(ownerId, workspaceId) {
  const ws = await StudyWorkspace.findOne({ _id: workspaceId, owner: ownerId });
  return ws;
}

async function ensureFolderOwned(ownerId, folderId, workspaceId) {
  if (!folderId) return null;
  const q = { _id: folderId, owner: ownerId };
  if (workspaceId) q.workspace = workspaceId;
  const folder = await StudyFolder.findOne(q);
  return folder;
}

// --- Workspaces ---

// GET /api/study/workspaces
router.get('/workspaces', isAuthenticated, async (req, res) => {
  try {
    const owner = req.session.userId;
    const items = await StudyWorkspace.find({ owner })
      .select('_id title goal emoji mode xp level streakCount focusDateKey focus createdAt updatedAt')
      .sort({ updatedAt: -1, createdAt: -1 })
      .lean();

    return res.json({ items: items || [] });
  } catch (error) {
    Logger.error('List study workspaces failed', { error: error?.message });
    return res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/study/workspaces
router.post('/workspaces', isAuthenticated, async (req, res) => {
  try {
    const owner = req.session.userId;

    const title = normalizeText(req.body?.title || 'My Study Room', 80);
    if (!title) return res.status(400).json({ error: 'Title is required' });

    const goal = normalizeText(req.body?.goal || '', 300);
    const emoji = normalizeText(req.body?.emoji || '', 10);
    const modeRaw = normalizeText(req.body?.mode || 'build', 20).toLowerCase();
    const mode = STUDY_WORKSPACE_MODES.includes(modeRaw) ? modeRaw : 'build';

    const count = await StudyWorkspace.countDocuments({ owner });
    // Allow users to create more workspaces.
    if (count >= 200) return res.status(400).json({ error: 'Workspace limit reached' });

    const ws = await StudyWorkspace.create({ owner, title, goal, emoji, mode });
    return res.status(201).json({
      workspace: {
        id: ws._id.toString(),
        title: ws.title,
        goal: ws.goal,
        emoji: ws.emoji,
        mode: ws.mode,
        xp: ws.xp,
        level: ws.level,
        streakCount: ws.streakCount,
        createdAt: ws.createdAt,
        updatedAt: ws.updatedAt,
      }
    });
  } catch (error) {
    Logger.error('Create study workspace failed', { error: error?.message });
    return res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/study/workspaces/:id
router.patch('/workspaces/:id', isAuthenticated, async (req, res) => {
  try {
    const owner = req.session.userId;
    const id = asObjectIdString(req.params.id);

    const ws = await StudyWorkspace.findOne({ _id: id, owner });
    if (!ws) return res.status(404).json({ error: 'Workspace not found' });

    if (req.body?.title !== undefined) {
      const title = normalizeText(req.body.title, 80);
      if (!title) return res.status(400).json({ error: 'Title is required' });
      ws.title = title;
    }

    if (req.body?.goal !== undefined) {
      ws.goal = normalizeText(req.body.goal, 300);
    }

    if (req.body?.emoji !== undefined) {
      ws.emoji = normalizeText(req.body.emoji, 10);
    }

    if (req.body?.mode !== undefined) {
      const modeRaw = normalizeText(req.body.mode, 20).toLowerCase();
      if (!STUDY_WORKSPACE_MODES.includes(modeRaw)) {
        return res.status(400).json({ error: 'Invalid mode' });
      }
      ws.mode = modeRaw;
    }

    // Replace focus list for today ("Next 3").
    if (req.body?.focus !== undefined) {
      const focus = Array.isArray(req.body.focus) ? req.body.focus : [];
      if (focus.length > 3) return res.status(400).json({ error: 'Focus list cannot exceed 3' });

      const normalized = focus
        .map((f) => ({
          kind: normalizeText(f?.kind, 20).toLowerCase(),
          refId: asObjectIdString(f?.refId || f?.id),
        }))
        .filter((f) => (f.kind === 'item' || f.kind === 'todo') && f.refId);

      // Validate ownership of referenced objects.
      const itemIds = normalized.filter((f) => f.kind === 'item').map((f) => f.refId);
      const todoIds = normalized.filter((f) => f.kind === 'todo').map((f) => f.refId);

      if (itemIds.length) {
        const owned = await StudyItem.countDocuments({ owner, workspace: id, _id: { $in: itemIds } });
        if (owned !== itemIds.length) return res.status(400).json({ error: 'Invalid focus item' });
      }
      if (todoIds.length) {
        const owned = await StudyTodo.countDocuments({ owner, workspace: id, _id: { $in: todoIds } });
        if (owned !== todoIds.length) return res.status(400).json({ error: 'Invalid focus todo' });
      }

      ws.focusDateKey = dailyKeyUtc();
      ws.focus = normalized.map((f) => ({ kind: f.kind, refId: f.refId, addedAt: new Date() }));
    }

    await ws.save();
    return res.json({
      workspace: {
        id: ws._id.toString(),
        title: ws.title,
        goal: ws.goal,
        emoji: ws.emoji,
        mode: ws.mode,
        xp: ws.xp,
        level: ws.level,
        streakCount: ws.streakCount,
        focusDateKey: ws.focusDateKey,
        focus: (ws.focus || []).map((f) => ({ kind: f.kind, refId: f.refId.toString(), addedAt: f.addedAt })),
        createdAt: ws.createdAt,
        updatedAt: ws.updatedAt,
      }
    });
  } catch (error) {
    Logger.error('Update study workspace failed', { error: error?.message });
    return res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/study/workspaces/:id
router.delete('/workspaces/:id', isAuthenticated, async (req, res) => {
  try {
    const owner = req.session.userId;
    const id = asObjectIdString(req.params.id);

    const ws = await StudyWorkspace.findOne({ _id: id, owner });
    if (!ws) return res.status(404).json({ error: 'Workspace not found' });

    await Promise.all([
      StudyFolder.deleteMany({ owner, workspace: id }),
      StudyItem.deleteMany({ owner, workspace: id }),
      StudyTodo.deleteMany({ owner, workspace: id }),
    ]);

    await ws.deleteOne();
    return res.json({ ok: true });
  } catch (error) {
    Logger.error('Delete study workspace failed', { error: error?.message });
    return res.status(500).json({ error: 'Server error' });
  }
});

// --- Folders ---

// GET /api/study/folders?workspaceId=...
router.get('/folders', isAuthenticated, async (req, res) => {
  try {
    const owner = req.session.userId;
    const workspaceId = asObjectIdString(req.query?.workspaceId);
    if (!workspaceId) return res.status(400).json({ error: 'workspaceId is required' });

    const ws = await ensureWorkspaceOwned(owner, workspaceId);
    if (!ws) return res.status(404).json({ error: 'Workspace not found' });

    const items = await StudyFolder.find({ owner, workspace: workspaceId })
      .select('_id name sortOrder createdAt updatedAt')
      .sort({ sortOrder: 1, createdAt: 1 })
      .lean();

    return res.json({ items: items || [] });
  } catch (error) {
    Logger.error('List study folders failed', { error: error?.message });
    return res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/study/folders
router.post('/folders', isAuthenticated, async (req, res) => {
  try {
    const owner = req.session.userId;
    const workspaceId = asObjectIdString(req.body?.workspaceId);
    const name = normalizeText(req.body?.name, 60);
    const sortOrder = Number.isFinite(Number(req.body?.sortOrder)) ? Number(req.body.sortOrder) : 0;

    if (!workspaceId) return res.status(400).json({ error: 'workspaceId is required' });
    if (!name) return res.status(400).json({ error: 'name is required' });

    const ws = await ensureWorkspaceOwned(owner, workspaceId);
    if (!ws) return res.status(404).json({ error: 'Workspace not found' });

    const count = await StudyFolder.countDocuments({ owner, workspace: workspaceId });
    if (count >= 100) return res.status(400).json({ error: 'Folder limit reached' });

    const folder = await StudyFolder.create({ owner, workspace: workspaceId, name, sortOrder });
    return res.status(201).json({
      folder: {
        id: folder._id.toString(),
        name: folder.name,
        sortOrder: folder.sortOrder,
        createdAt: folder.createdAt,
        updatedAt: folder.updatedAt,
      }
    });
  } catch (error) {
    // Handle duplicate folder name
    if (String(error?.code) === '11000') {
      return res.status(400).json({ error: 'Folder name already exists' });
    }
    Logger.error('Create study folder failed', { error: error?.message });
    return res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/study/folders/:id
router.patch('/folders/:id', isAuthenticated, async (req, res) => {
  try {
    const owner = req.session.userId;
    const id = asObjectIdString(req.params.id);

    const folder = await StudyFolder.findOne({ _id: id, owner });
    if (!folder) return res.status(404).json({ error: 'Folder not found' });

    if (req.body?.name !== undefined) {
      const name = normalizeText(req.body.name, 60);
      if (!name) return res.status(400).json({ error: 'name is required' });
      folder.name = name;
    }

    if (req.body?.sortOrder !== undefined) {
      folder.sortOrder = Number.isFinite(Number(req.body.sortOrder)) ? Number(req.body.sortOrder) : folder.sortOrder;
    }

    await folder.save();
    return res.json({
      folder: {
        id: folder._id.toString(),
        name: folder.name,
        sortOrder: folder.sortOrder,
        createdAt: folder.createdAt,
        updatedAt: folder.updatedAt,
      }
    });
  } catch (error) {
    if (String(error?.code) === '11000') {
      return res.status(400).json({ error: 'Folder name already exists' });
    }
    Logger.error('Update study folder failed', { error: error?.message });
    return res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/study/folders/:id
router.delete('/folders/:id', isAuthenticated, async (req, res) => {
  try {
    const owner = req.session.userId;
    const id = asObjectIdString(req.params.id);

    const folder = await StudyFolder.findOne({ _id: id, owner });
    if (!folder) return res.status(404).json({ error: 'Folder not found' });

    // Move items out of folder (preserve user data)
    await StudyItem.updateMany({ owner, folder: id }, { $set: { folder: null } });
    await folder.deleteOne();

    return res.json({ ok: true });
  } catch (error) {
    Logger.error('Delete study folder failed', { error: error?.message });
    return res.status(500).json({ error: 'Server error' });
  }
});

// --- Items ---

// GET /api/study/templates
router.get('/templates', isAuthenticated, async (req, res) => {
  return res.json({
    items: templates.map((t) => ({ id: t.id, title: t.title, emoji: t.emoji, goal: t.goal }))
  });
});

// POST /api/study/workspaces/from-template
router.post('/workspaces/from-template', isAuthenticated, async (req, res) => {
  try {
    const owner = req.session.userId;
    const templateId = normalizeText(req.body?.templateId || '', 80);
    const t = templates.find((x) => x.id === templateId);
    if (!t) return res.status(400).json({ error: 'Invalid templateId' });

    const title = normalizeText(req.body?.title || t.title, 80);
    const goal = normalizeText(req.body?.goal || t.goal || '', 300);
    const emoji = normalizeText(req.body?.emoji || t.emoji || '', 10);
    const modeRaw = normalizeText(req.body?.mode || 'build', 20).toLowerCase();
    const mode = STUDY_WORKSPACE_MODES.includes(modeRaw) ? modeRaw : 'build';

    const count = await StudyWorkspace.countDocuments({ owner });
    if (count >= 200) return res.status(400).json({ error: 'Workspace limit reached' });

    const ws = await StudyWorkspace.create({ owner, title, goal, emoji, mode });

    const folderDocs = await StudyFolder.insertMany(
      (t.folders || []).slice(0, 20).map((name, idx) => ({
        owner,
        workspace: ws._id,
        name: normalizeText(name, 60) || `Folder ${idx + 1}`,
        sortOrder: idx,
      })),
      { ordered: true }
    ).catch(() => []);

    const firstFolderId = folderDocs && folderDocs[0] ? folderDocs[0]._id : null;

    const createdItems = await StudyItem.insertMany(
      (t.items || []).slice(0, 50).map((it, idx) => ({
        owner,
        workspace: ws._id,
        folder: firstFolderId,
        type: it.type,
        title: normalizeText(it.title || '', 160),
        note: normalizeText(it.note || '', 8000),
        url: normalizeText(it.url || '', 1200),
        tags: normalizeTags(it.tags || []),
        status: 'saved',
        pinned: idx === 0,
        lastTouchedAt: new Date(),
      })),
      { ordered: true }
    ).catch(() => []);

    await StudyTodo.insertMany(
      (t.todos || []).slice(0, 50).map((td, idx) => ({
        owner,
        workspace: ws._id,
        item: null,
        text: normalizeText(td.text || '', 240) || `Todo ${idx + 1}`,
        kind: STUDY_TODO_KIND.includes(String(td.kind || '').toLowerCase()) ? String(td.kind).toLowerCase() : 'task',
        priority: ['low', 'normal', 'high'].includes(String(td.priority || '').toLowerCase()) ? String(td.priority).toLowerCase() : 'normal',
        done: false,
        sortOrder: idx,
      })),
      { ordered: true }
    ).catch(() => []);

    // Give a small XP boost for starting a template.
    await bumpWorkspaceActivity(owner, ws._id, { xpDelta: 10 });

    return res.status(201).json({
      workspace: {
        id: ws._id.toString(),
        title: ws.title,
        goal: ws.goal,
        emoji: ws.emoji,
        mode: ws.mode,
        xp: ws.xp,
        level: ws.level,
        streakCount: ws.streakCount,
        createdAt: ws.createdAt,
        updatedAt: ws.updatedAt,
      },
      seeded: {
        folders: (folderDocs || []).length,
        items: (createdItems || []).length,
        todos: (t.todos || []).length,
      }
    });
  } catch (error) {
    Logger.error('Create study workspace from template failed', { error: error?.message });
    return res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/study/items?workspaceId=...&folderId=...&status=...
router.get('/items', isAuthenticated, async (req, res) => {
  try {
    const owner = req.session.userId;
    const workspaceId = asObjectIdString(req.query?.workspaceId);
    const folderId = asObjectIdString(req.query?.folderId);
    const status = normalizeText(req.query?.status || '', 20).toLowerCase();

    if (!workspaceId) return res.status(400).json({ error: 'workspaceId is required' });
    const ws = await ensureWorkspaceOwned(owner, workspaceId);
    if (!ws) return res.status(404).json({ error: 'Workspace not found' });

    const q = { owner, workspace: workspaceId };
    if (folderId) q.folder = folderId;
    if (status) {
      if (!STUDY_ITEM_STATUS.includes(status)) return res.status(400).json({ error: 'Invalid status' });
      q.status = status;
    }

    const items = await StudyItem.find(q)
      .select('_id type title url note tags status progressPercent pinned mastery reviewEnabled reviewStage nextReviewAt lastReviewedAt lastTouchedAt folder resource document createdAt updatedAt sortOrder')
      .sort({ pinned: -1, sortOrder: 1, updatedAt: -1, createdAt: -1 })
      .lean();

    return res.json({ items: items || [] });
  } catch (error) {
    Logger.error('List study items failed', { error: error?.message });
    return res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/study/items
router.post('/items', isAuthenticated, async (req, res) => {
  try {
    const owner = req.session.userId;
    const workspaceId = asObjectIdString(req.body?.workspaceId);
    const folderId = asObjectIdString(req.body?.folderId);
    const type = normalizeText(req.body?.type, 20).toLowerCase();

    if (!workspaceId) return res.status(400).json({ error: 'workspaceId is required' });
    if (!STUDY_ITEM_TYPES.includes(type)) return res.status(400).json({ error: 'Invalid type' });

    const ws = await ensureWorkspaceOwned(owner, workspaceId);
    if (!ws) return res.status(404).json({ error: 'Workspace not found' });

    const folder = await ensureFolderOwned(owner, folderId, workspaceId);
    if (folderId && !folder) return res.status(404).json({ error: 'Folder not found' });

    const count = await StudyItem.countDocuments({ owner, workspace: workspaceId });
    if (count >= 2000) return res.status(400).json({ error: 'Item limit reached' });

    const tags = normalizeTags(req.body?.tags);
    const title = normalizeText(req.body?.title || '', 160);
    const note = normalizeText(req.body?.note || '', 8000);
    const url = normalizeText(req.body?.url || '', 1200);
    const pinned = Boolean(req.body?.pinned);
    const status = normalizeText(req.body?.status || 'saved', 20).toLowerCase();
    if (status && !STUDY_ITEM_STATUS.includes(status)) return res.status(400).json({ error: 'Invalid status' });

    const masteryRaw = normalizeText(req.body?.mastery || 'none', 20).toLowerCase();
    const mastery = STUDY_ITEM_MASTERY.includes(masteryRaw) ? masteryRaw : 'none';

    const reviewEnabled = Boolean(req.body?.reviewEnabled);

    const progressPercentRaw = req.body?.progressPercent;
    const progressPercent = Number.isFinite(Number(progressPercentRaw)) ? Number(progressPercentRaw) : 0;

    const itemPayload = {
      owner,
      workspace: workspaceId,
      folder: folder ? folder._id : null,
      type,
      title,
      note,
      url,
      tags,
      status,
      progressPercent,
      pinned,
      mastery,
      reviewEnabled,
      nextReviewAt: reviewEnabled ? new Date(Date.now() + 24 * 60 * 60 * 1000) : null,
      lastTouchedAt: new Date(),
    };

    if (type === 'resource') {
      const resourceId = asObjectIdString(req.body?.resourceId);
      if (!resourceId) return res.status(400).json({ error: 'resourceId is required' });
      const resource = await Resource.findOne({ _id: resourceId, isActive: true }).select('_id title url fileUrl kind level').lean();
      if (!resource) return res.status(404).json({ error: 'Resource not found' });
      itemPayload.resource = resourceId;
      if (!itemPayload.title) itemPayload.title = resource.title || '';
    }

    if (type === 'document') {
      const documentId = asObjectIdString(req.body?.documentId);
      if (!documentId) return res.status(400).json({ error: 'documentId is required' });
      const doc = await Document.findOne({ _id: documentId, owner, deletedAt: null })
        .select('_id originalName label')
        .lean();
      if (!doc) return res.status(404).json({ error: 'Document not found' });
      itemPayload.document = documentId;
      if (!itemPayload.title) itemPayload.title = doc.label || doc.originalName || '';
    }

    // link/note validation is enforced by model pre-validate.

    const item = await StudyItem.create(itemPayload);

    // Activity: creating an item is a small learning action.
    await bumpWorkspaceActivity(owner, workspaceId, { xpDelta: 2 });

    return res.status(201).json({
      item: {
        id: item._id.toString(),
        type: item.type,
        title: item.title,
        url: item.url,
        note: item.note,
        tags: item.tags,
        status: item.status,
        progressPercent: item.progressPercent,
        pinned: item.pinned,
        mastery: item.mastery,
        reviewEnabled: item.reviewEnabled,
        reviewStage: item.reviewStage,
        nextReviewAt: item.nextReviewAt,
        lastReviewedAt: item.lastReviewedAt,
        folderId: item.folder ? item.folder.toString() : null,
        resourceId: item.resource ? item.resource.toString() : null,
        documentId: item.document ? item.document.toString() : null,
        lastTouchedAt: item.lastTouchedAt,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      }
    });
  } catch (error) {
    const message = String(error?.message || 'Server error');
    if (message.toLowerCase().includes('required')) {
      return res.status(400).json({ error: message });
    }
    Logger.error('Create study item failed', { error: error?.message });
    return res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/study/items/:id
router.patch('/items/:id', isAuthenticated, async (req, res) => {
  try {
    const owner = req.session.userId;
    const id = asObjectIdString(req.params.id);

    const item = await StudyItem.findOne({ _id: id, owner });
    if (!item) return res.status(404).json({ error: 'Item not found' });

    if (req.body?.title !== undefined) item.title = normalizeText(req.body.title, 160);
    if (req.body?.note !== undefined) item.note = normalizeText(req.body.note, 8000);
    if (req.body?.url !== undefined) item.url = normalizeText(req.body.url, 1200);

    if (req.body?.tags !== undefined) item.tags = normalizeTags(req.body.tags);
    if (req.body?.pinned !== undefined) item.pinned = Boolean(req.body.pinned);

    if (req.body?.status !== undefined) {
      const status = normalizeText(req.body.status, 20).toLowerCase();
      if (!STUDY_ITEM_STATUS.includes(status)) return res.status(400).json({ error: 'Invalid status' });
      item.status = status;
    }

    if (req.body?.progressPercent !== undefined) {
      const v = Number(req.body.progressPercent);
      if (!Number.isFinite(v) || v < 0 || v > 100) return res.status(400).json({ error: 'Invalid progressPercent' });
      item.progressPercent = v;
    }

    if (req.body?.mastery !== undefined) {
      const masteryRaw = normalizeText(req.body.mastery, 20).toLowerCase();
      if (!STUDY_ITEM_MASTERY.includes(masteryRaw)) return res.status(400).json({ error: 'Invalid mastery' });
      item.mastery = masteryRaw;
    }

    if (req.body?.reviewEnabled !== undefined) {
      item.reviewEnabled = Boolean(req.body.reviewEnabled);
      if (item.reviewEnabled && !item.nextReviewAt) {
        item.nextReviewAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      }
      if (!item.reviewEnabled) {
        item.nextReviewAt = null;
        item.reviewStage = 0;
      }
    }

    if (req.body?.folderId !== undefined) {
      const folderId = asObjectIdString(req.body.folderId);
      if (!folderId) {
        item.folder = null;
      } else {
        const folder = await ensureFolderOwned(owner, folderId, item.workspace);
        if (!folder) return res.status(404).json({ error: 'Folder not found' });
        item.folder = folder._id;
      }
    }

    if (req.body?.sortOrder !== undefined) {
      item.sortOrder = Number.isFinite(Number(req.body.sortOrder)) ? Number(req.body.sortOrder) : item.sortOrder;
    }

    item.lastTouchedAt = new Date();
    await item.save();

    // If the user completes an item, award more XP.
    if (item.status === 'completed') {
      await bumpWorkspaceActivity(owner, item.workspace, { xpDelta: 15 });
    } else {
      await bumpWorkspaceActivity(owner, item.workspace, { xpDelta: 1 });
    }

    return res.json({
      item: {
        id: item._id.toString(),
        type: item.type,
        title: item.title,
        url: item.url,
        note: item.note,
        tags: item.tags,
        status: item.status,
        progressPercent: item.progressPercent,
        pinned: item.pinned,
        mastery: item.mastery,
        reviewEnabled: item.reviewEnabled,
        reviewStage: item.reviewStage,
        nextReviewAt: item.nextReviewAt,
        lastReviewedAt: item.lastReviewedAt,
        folderId: item.folder ? item.folder.toString() : null,
        resourceId: item.resource ? item.resource.toString() : null,
        documentId: item.document ? item.document.toString() : null,
        lastTouchedAt: item.lastTouchedAt,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      }
    });
  } catch (error) {
    const message = String(error?.message || 'Server error');
    if (message.toLowerCase().includes('required') || message.toLowerCase().includes('must')) {
      return res.status(400).json({ error: message });
    }
    Logger.error('Update study item failed', { error: error?.message });
    return res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/study/items/:id/review
// Marks an item as reviewed and schedules the next review date.
router.post('/items/:id/review', isAuthenticated, async (req, res) => {
  try {
    const owner = req.session.userId;
    const id = asObjectIdString(req.params.id);

    const item = await StudyItem.findOne({ _id: id, owner });
    if (!item) return res.status(404).json({ error: 'Item not found' });

    item.reviewEnabled = true;

    const scheduleDays = [1, 3, 7, 14, 30, 60];
    const stage = Number.isFinite(Number(item.reviewStage)) ? Number(item.reviewStage) : 0;
    const nextStage = Math.min(stage + 1, scheduleDays.length - 1);

    item.reviewStage = nextStage;
    item.lastReviewedAt = new Date();
    item.nextReviewAt = new Date(Date.now() + scheduleDays[nextStage] * 24 * 60 * 60 * 1000);
    item.lastTouchedAt = new Date();
    await item.save();

    await bumpWorkspaceActivity(owner, item.workspace, { xpDelta: 10 });

    return res.json({
      item: {
        id: item._id.toString(),
        reviewEnabled: item.reviewEnabled,
        reviewStage: item.reviewStage,
        nextReviewAt: item.nextReviewAt,
        lastReviewedAt: item.lastReviewedAt,
      }
    });
  } catch (error) {
    Logger.error('Review study item failed', { error: error?.message });
    return res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/study/items/:id
router.delete('/items/:id', isAuthenticated, async (req, res) => {
  try {
    const owner = req.session.userId;
    const id = asObjectIdString(req.params.id);

    const item = await StudyItem.findOne({ _id: id, owner });
    if (!item) return res.status(404).json({ error: 'Item not found' });

    // Delete attached todos (avoid orphans)
    await StudyTodo.deleteMany({ owner, item: id });
    await item.deleteOne();
    return res.json({ ok: true });
  } catch (error) {
    Logger.error('Delete study item failed', { error: error?.message });
    return res.status(500).json({ error: 'Server error' });
  }
});

// --- Todos ---

// GET /api/study/todos?workspaceId=...&itemId=...
router.get('/todos', isAuthenticated, async (req, res) => {
  try {
    const owner = req.session.userId;
    const workspaceId = asObjectIdString(req.query?.workspaceId);
    const itemId = asObjectIdString(req.query?.itemId);

    if (!workspaceId) return res.status(400).json({ error: 'workspaceId is required' });
    const ws = await ensureWorkspaceOwned(owner, workspaceId);
    if (!ws) return res.status(404).json({ error: 'Workspace not found' });

    const q = { owner, workspace: workspaceId };
    if (itemId) q.item = itemId;

    const items = await StudyTodo.find(q)
      .select('_id text kind done dueAt priority item createdAt updatedAt sortOrder')
      .sort({ done: 1, dueAt: 1, sortOrder: 1, createdAt: -1 })
      .lean();

    return res.json({ items: items || [] });
  } catch (error) {
    Logger.error('List study todos failed', { error: error?.message });
    return res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/study/todos
router.post('/todos', isAuthenticated, async (req, res) => {
  try {
    const owner = req.session.userId;
    const workspaceId = asObjectIdString(req.body?.workspaceId);
    const itemId = asObjectIdString(req.body?.itemId);
    const text = normalizeText(req.body?.text, 240);

    if (!workspaceId) return res.status(400).json({ error: 'workspaceId is required' });
    if (!text) return res.status(400).json({ error: 'text is required' });

    const ws = await ensureWorkspaceOwned(owner, workspaceId);
    if (!ws) return res.status(404).json({ error: 'Workspace not found' });

    let item = null;
    if (itemId) {
      item = await StudyItem.findOne({ _id: itemId, owner, workspace: workspaceId }).select('_id').lean();
      if (!item) return res.status(404).json({ error: 'Item not found' });
    }

    const dueAt = parseOptionalDate(req.body?.dueAt);
    const priorityRaw = normalizeText(req.body?.priority || 'normal', 20).toLowerCase();
    const priority = ['low', 'normal', 'high'].includes(priorityRaw) ? priorityRaw : 'normal';
    const kindRaw = normalizeText(req.body?.kind || 'task', 20).toLowerCase();
    const kind = STUDY_TODO_KIND.includes(kindRaw) ? kindRaw : 'task';
    const sortOrder = Number.isFinite(Number(req.body?.sortOrder)) ? Number(req.body.sortOrder) : 0;

    const todo = await StudyTodo.create({
      owner,
      workspace: workspaceId,
      item: item ? item._id : null,
      text,
      kind,
      dueAt,
      priority,
      sortOrder,
    });

    await bumpWorkspaceActivity(owner, workspaceId, { xpDelta: 2 });

    return res.status(201).json({
      todo: {
        id: todo._id.toString(),
        text: todo.text,
        kind: todo.kind,
        done: todo.done,
        dueAt: todo.dueAt,
        priority: todo.priority,
        itemId: todo.item ? todo.item.toString() : null,
        createdAt: todo.createdAt,
        updatedAt: todo.updatedAt,
      }
    });
  } catch (error) {
    Logger.error('Create study todo failed', { error: error?.message });
    return res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/study/todos/:id
router.patch('/todos/:id', isAuthenticated, async (req, res) => {
  try {
    const owner = req.session.userId;
    const id = asObjectIdString(req.params.id);

    const todo = await StudyTodo.findOne({ _id: id, owner });
    if (!todo) return res.status(404).json({ error: 'Todo not found' });

    if (req.body?.text !== undefined) {
      const text = normalizeText(req.body.text, 240);
      if (!text) return res.status(400).json({ error: 'text is required' });
      todo.text = text;
    }

    if (req.body?.done !== undefined) todo.done = Boolean(req.body.done);

    if (req.body?.kind !== undefined) {
      const kindRaw = normalizeText(req.body.kind, 20).toLowerCase();
      todo.kind = STUDY_TODO_KIND.includes(kindRaw) ? kindRaw : todo.kind;
    }

    if (req.body?.dueAt !== undefined) todo.dueAt = parseOptionalDate(req.body.dueAt);

    if (req.body?.priority !== undefined) {
      const priorityRaw = normalizeText(req.body.priority, 20).toLowerCase();
      todo.priority = ['low', 'normal', 'high'].includes(priorityRaw) ? priorityRaw : 'normal';
    }

    if (req.body?.sortOrder !== undefined) {
      todo.sortOrder = Number.isFinite(Number(req.body.sortOrder)) ? Number(req.body.sortOrder) : todo.sortOrder;
    }

    await todo.save();

    // Reward marking a todo as done.
    if (req.body?.done === true) {
      await bumpWorkspaceActivity(owner, todo.workspace, { xpDelta: 5 });
    }

    return res.json({
      todo: {
        id: todo._id.toString(),
        text: todo.text,
        kind: todo.kind,
        done: todo.done,
        dueAt: todo.dueAt,
        priority: todo.priority,
        itemId: todo.item ? todo.item.toString() : null,
        createdAt: todo.createdAt,
        updatedAt: todo.updatedAt,
      }
    });
  } catch (error) {
    Logger.error('Update study todo failed', { error: error?.message });
    return res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/study/todos/:id
router.delete('/todos/:id', isAuthenticated, async (req, res) => {
  try {
    const owner = req.session.userId;
    const id = asObjectIdString(req.params.id);

    const todo = await StudyTodo.findOne({ _id: id, owner });
    if (!todo) return res.status(404).json({ error: 'Todo not found' });

    await todo.deleteOne();
    return res.json({ ok: true });
  } catch (error) {
    Logger.error('Delete study todo failed', { error: error?.message });
    return res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
