/*
  public/js/study.js

  Study Room client.
  - Multiple workspaces per user
  - Folders
  - Items (resources/documents/links/notes)
  - Todos (workspace-level or item-level)

  Keeps UI simple but useful: quick-add flows and lightweight progress.
*/
(function () {
  const el = (id) => document.getElementById(id);

  const state = {
    workspaces: [],
    folders: [],
    items: [],
    todos: [],
    reviewItems: [],
    templates: [],
    selectedWorkspaceId: null,
    selectedFolderId: '',
    selectedStatus: 'active',
    selectedItemId: null,
    resourcesSearchResults: [],
    documents: [],
  };

  const api = {
    async json(url, options) {
      const res = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...(options && options.headers ? options.headers : {})
        },
        credentials: 'include',
        ...options,
      });
      const contentType = res.headers.get('content-type') || '';
      const body = contentType.includes('application/json') ? await res.json() : await res.text();

      if (!res.ok) {
        const errMsg = (body && body.error) ? body.error : `Request failed (${res.status})`;
        const error = new Error(errMsg);
        error.status = res.status;
        throw error;
      }

      return body;
    },

    get(url) {
      return api.json(url, { method: 'GET' });
    },
    post(url, data) {
      return api.json(url, { method: 'POST', body: JSON.stringify(data || {}) });
    },
    patch(url, data) {
      return api.json(url, { method: 'PATCH', body: JSON.stringify(data || {}) });
    },
    del(url) {
      return api.json(url, { method: 'DELETE' });
    },
  };

  const escapeHtml = (s) => String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

  const dailyKeyUtc = () => {
    const now = new Date();
    const y = now.getUTCFullYear();
    const m = String(now.getUTCMonth() + 1).padStart(2, '0');
    const d = String(now.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const formatDate = (d) => {
    if (!d) return '';
    const dt = new Date(d);
    if (!Number.isFinite(dt.getTime())) return '';
    return dt.toLocaleDateString();
  };

  const openSignInModal = () => {
    const signInModal = el('signInModal');
    if (signInModal) signInModal.style.display = 'block';
  };

  async function ensureSignedIn() {
    try {
      if (window.auth && typeof window.auth.checkAuthStatus === 'function') {
        await window.auth.checkAuthStatus();
      }
    } catch {
      // ignore
    }

    if (!window.auth || !window.auth.currentUser) {
      renderSignedOut();
      openSignInModal();
      return false;
    }

    return true;
  }

  function renderSignedOut() {
    const container = el('studyContainer');
    if (!container) return;
    container.innerHTML = `
      <div class="empty-message">
        <h2>Sign in required</h2>
        <p>Please sign in to use Study Room.</p>
        <button type="button" class="btn-primary" id="openSignInFromStudy">Sign In</button>
      </div>
    `;
    const btn = el('openSignInFromStudy');
    if (btn) btn.addEventListener('click', openSignInModal);
  }

  function renderSkeleton() {
    const container = el('studyContainer');
    if (!container) return;

    container.innerHTML = `
      <div class="dashboard-header">
        <div>
          <h2>Study Room</h2>
          <p class="muted-text">Your personal workspaces for resources, PDFs, to-dos, and progress.</p>
        </div>
        <div class="form-actions">
          <button type="button" class="btn-secondary" id="studyNewWorkspace">New workspace</button>
        </div>
      </div>

      <div class="stats-grid" id="studyStats"></div>

      <div class="dashboard-section" id="studyEnhancements" aria-label="Study enhancements">
        <h3>Focus + Review</h3>
        <p class="muted-text">Mode, daily focus (Next 3), and spaced review.</p>

        <div class="study-toolbar">
          <div class="study-toolbar-row">
            <label class="study-label">
              Mode
              <select id="studyModeSelect" class="form-control">
                <option value="build">Build</option>
                <option value="revise">Revise</option>
                <option value="interview">Interview</option>
              </select>
            </label>
            <button type="button" class="btn-secondary" id="studyModeSave">Save mode</button>
            <span class="study-muted" id="studyGamification"></span>
          </div>

          <div>
            <h3>Next 3 (Daily Focus)</h3>
            <p class="muted-text">Add up to 3 items or to-dos to focus on today.</p>
            <div id="studyFocusList" class="study-items"></div>
          </div>

          <div>
            <h3>Review Queue</h3>
            <p class="muted-text">Items with review enabled and due now.</p>
            <div id="studyReviewList" class="study-items"></div>
          </div>

          <div class="study-toolbar-row">
            <label class="study-label">
              Templates
              <select id="studyTemplateSelect" class="form-control"></select>
            </label>
            <button type="button" class="btn-secondary" id="studyTemplateCreate">Create from template</button>
          </div>
        </div>
      </div>

      <div class="dashboard-content">
        <section class="dashboard-section" aria-label="Study items">
          <div class="study-toolbar">
            <div class="study-toolbar-row">
              <label class="study-label">
                Workspace
                <select id="studyWorkspaceSelect" class="form-control"></select>
              </label>

              <label class="study-label">
                Folder
                <select id="studyFolderSelect" class="form-control"></select>
              </label>

              <label class="study-label">
                Status
                <select id="studyStatusSelect" class="form-control">
                  <option value="active">Active</option>
                  <option value="saved">Saved</option>
                  <option value="completed">Completed</option>
                  <option value="archived">Archived</option>
                </select>
              </label>
            </div>

            <div class="study-toolbar-row">
              <button type="button" class="btn-primary" id="studyAddResource">Add resource</button>
              <button type="button" class="btn-primary" id="studyAddDocument">Add PDF/doc</button>
              <button type="button" class="btn-primary" id="studyAddLink">Add link</button>
              <button type="button" class="btn-primary" id="studyAddNote">Add note</button>
              <button type="button" class="btn-secondary" id="studyNewFolder">New folder</button>
              <button type="button" class="btn-secondary" id="studyEditWorkspace">Edit workspace</button>
            </div>
          </div>

          <div id="studyItems" class="study-items" aria-live="polite"></div>
        </section>

        <aside class="dashboard-sidebar" aria-label="Study details">
          <div class="dashboard-section">
            <h3>To-dos</h3>
            <p class="muted-text" id="studyTodosHint">Workspace to-dos</p>

            <div class="study-todo-add">
              <input type="text" id="studyTodoText" class="form-control" placeholder="Add a to-do (e.g. Finish chapter 3)">
              <select id="studyTodoKind" class="form-control" aria-label="To-do kind">
                <option value="task">Task</option>
                <option value="flashcards">Flashcards</option>
                <option value="practice">Practice</option>
                <option value="project">Project</option>
                <option value="quiz">Quiz</option>
              </select>
              <button type="button" class="btn-primary" id="studyTodoAddBtn">Add</button>
            </div>

            <div id="studyTodos" class="study-todos" aria-live="polite"></div>
          </div>

          <div class="dashboard-section">
            <h3>Quick search</h3>
            <p class="muted-text">Search curated Resources, then add to your workspace.</p>

            <div class="study-search">
              <input type="text" id="studyResourceSearch" class="form-control" placeholder="Search resources (e.g. React hooks, AWS IAM)">
              <button type="button" class="btn-secondary" id="studyResourceSearchBtn">Search</button>
            </div>
            <div id="studyResourceResults" class="study-search-results"></div>
          </div>
        </aside>
      </div>
    `;
  }

  function renderStats() {
    const statsEl = el('studyStats');
    if (!statsEl) return;

    const total = state.items.length;
    const completed = state.items.filter(i => i.status === 'completed').length;
    const active = state.items.filter(i => i.status === 'active').length;
    const pinned = state.items.filter(i => i.pinned).length;

    const todosTotal = state.todos.length;
    const todosDone = state.todos.filter(t => t.done).length;

    statsEl.innerHTML = `
      <div class="stat-card">
        <div class="stat-icon">📌</div>
        <div class="stat-info">
          <h3>${pinned}</h3>
          <p>Pinned items</p>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">📚</div>
        <div class="stat-info">
          <h3>${active}</h3>
          <p>Active items</p>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">✅</div>
        <div class="stat-info">
          <h3>${completed}/${total}</h3>
          <p>Completed</p>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">🧾</div>
        <div class="stat-info">
          <h3>${todosDone}/${todosTotal}</h3>
          <p>To-dos done</p>
        </div>
      </div>
    `;
  }

  function renderWorkspaceSelect() {
    const select = el('studyWorkspaceSelect');
    if (!select) return;

    const options = state.workspaces.map((ws) => {
      const emoji = ws.emoji ? `${escapeHtml(ws.emoji)} ` : '';
      return `<option value="${escapeHtml(ws.id)}">${emoji}${escapeHtml(ws.title)}</option>`;
    }).join('');

    select.innerHTML = options || '';
    if (!state.selectedWorkspaceId && state.workspaces[0]) {
      state.selectedWorkspaceId = state.workspaces[0].id;
    }
    select.value = state.selectedWorkspaceId || '';
  }

  function renderFolderSelect() {
    const select = el('studyFolderSelect');
    if (!select) return;

    const opts = [`<option value="">All folders</option>`, `<option value="__none__">No folder</option>`]
      .concat(
        state.folders.map((f) => `<option value="${escapeHtml(f.id)}">${escapeHtml(f.name)}</option>`)
      )
      .join('');

    select.innerHTML = opts;
    select.value = state.selectedFolderId || '';
  }

  function renderItems() {
    const itemsEl = el('studyItems');
    if (!itemsEl) return;

    if (!state.items.length) {
      itemsEl.innerHTML = `
        <div class="empty-message">
          <h3>No items yet</h3>
          <p>Add a Resource, PDF/doc, link, or note to start building your workspace.</p>
        </div>
      `;
      return;
    }

    const html = state.items.map((it) => {
      const typeLabel = it.type === 'resource' ? 'Resource' : it.type === 'document' ? 'Document' : it.type === 'link' ? 'Link' : 'Note';
      const pinned = it.pinned ? '📌' : '';
      const title = it.title || (it.type === 'link' ? it.url : it.type === 'note' ? it.note : 'Untitled');
      const progress = Number.isFinite(Number(it.progressPercent)) ? Number(it.progressPercent) : 0;
      const isSelected = state.selectedItemId && state.selectedItemId === it.id;

      const now = Date.now();
      const nextReviewMs = it.nextReviewAt ? new Date(it.nextReviewAt).getTime() : null;
      const reviewDue = it.reviewEnabled && nextReviewMs && nextReviewMs <= now;
      const reviewLabel = it.reviewEnabled
        ? (reviewDue ? 'Review due' : (it.nextReviewAt ? `Review ${formatDate(it.nextReviewAt)}` : 'Review enabled'))
        : 'Review off';

      const masteryLabel = it.mastery ? `Mastery: ${it.mastery}` : 'Mastery: none';

      const linkHtml = it.type === 'link' && it.url
        ? `<a class="study-item-link" href="${escapeHtml(it.url)}" target="_blank" rel="noopener noreferrer">Open</a>`
        : '';

      const tags = Array.isArray(it.tags) && it.tags.length
        ? `<div class="study-item-tags">${it.tags.map(t => `<span class="tag">${escapeHtml(t)}</span>`).join('')}</div>`
        : '';

      return `
        <div class="study-item ${isSelected ? 'study-item--selected' : ''}" data-id="${escapeHtml(it.id)}">
          <div class="study-item-header">
            <div>
              <div class="study-item-title">${pinned} ${escapeHtml(title)}</div>
              <div class="study-item-meta">
                <span class="study-pill">${escapeHtml(typeLabel)}</span>
                <span class="study-pill">${escapeHtml(it.status)}</span>
                <span class="study-pill">${escapeHtml(masteryLabel)}</span>
                <span class="study-pill">${escapeHtml(reviewLabel)}</span>
                ${it.lastTouchedAt ? `<span class="study-muted">Touched ${escapeHtml(formatDate(it.lastTouchedAt))}</span>` : ''}
              </div>
              ${tags}
            </div>
            <div class="study-item-actions">
              ${linkHtml}
              <button type="button" class="btn-secondary" data-action="focus">Focus</button>
              <button type="button" class="btn-secondary" data-action="mastery">Cycle mastery</button>
              <button type="button" class="btn-secondary" data-action="reviewToggle">${it.reviewEnabled ? 'Disable review' : 'Enable review'}</button>
              ${reviewDue ? `<button type="button" class="btn-secondary" data-action="review">Reviewed</button>` : ''}
              <button type="button" class="btn-secondary" data-action="pin">${it.pinned ? 'Unpin' : 'Pin'}</button>
              <button type="button" class="btn-secondary" data-action="edit">Edit</button>
              <button type="button" class="btn-secondary" data-action="delete">Delete</button>
            </div>
          </div>

          <div class="study-item-progress">
            <label>
              Progress
              <input type="range" min="0" max="100" step="5" value="${progress}" data-action="progress">
              <span class="study-progress-value">${progress}%</span>
            </label>
            <div class="study-item-status-actions">
              <button type="button" class="btn-secondary" data-action="status" data-status="saved">Saved</button>
              <button type="button" class="btn-secondary" data-action="status" data-status="active">Active</button>
              <button type="button" class="btn-secondary" data-action="status" data-status="completed">Complete</button>
              <button type="button" class="btn-secondary" data-action="status" data-status="archived">Archive</button>
            </div>
          </div>
        </div>
      `;
    }).join('');

    itemsEl.innerHTML = html;
  }

  function renderTodos() {
    const todosEl = el('studyTodos');
    if (!todosEl) return;

    if (!state.todos.length) {
      todosEl.innerHTML = `<p class="muted-text">No to-dos yet.</p>`;
      return;
    }

    todosEl.innerHTML = state.todos.map((t) => {
      const due = t.dueAt ? `Due ${escapeHtml(formatDate(t.dueAt))}` : '';
      return `
        <div class="study-todo" data-id="${escapeHtml(t.id)}">
          <label class="study-todo-check">
            <input type="checkbox" data-action="toggle" ${t.done ? 'checked' : ''}>
            <span class="study-todo-text ${t.done ? 'study-todo-text--done' : ''}">${escapeHtml(t.text)}</span>
          </label>
          <div class="study-todo-meta">
            ${due ? `<span class="study-muted">${due}</span>` : ''}
            <span class="study-pill">${escapeHtml(t.kind || 'task')}</span>
            <span class="study-pill">${escapeHtml(t.priority || 'normal')}</span>
            <button type="button" class="btn-secondary" data-action="focus">Focus</button>
            <button type="button" class="btn-secondary" data-action="edit">Edit</button>
            <button type="button" class="btn-secondary" data-action="delete">Delete</button>
          </div>
        </div>
      `;
    }).join('');
  }

  function getActiveWorkspace() {
    return state.workspaces.find(w => w.id === state.selectedWorkspaceId) || null;
  }

  function getWorkspaceFocus(ws) {
    if (!ws) return [];
    if (ws.focusDateKey !== dailyKeyUtc()) return [];
    return Array.isArray(ws.focus) ? ws.focus : [];
  }

  async function patchWorkspaceFocus(nextFocus) {
    const ws = getActiveWorkspace();
    if (!ws) return;
    await api.patch(`/api/study/workspaces/${encodeURIComponent(ws.id)}`, { focus: nextFocus });
    await loadWorkspaces();
    renderEnhancements();
  }

  function renderEnhancements() {
    const ws = getActiveWorkspace();
    const modeSelect = el('studyModeSelect');
    const modeSave = el('studyModeSave');
    const gamification = el('studyGamification');
    const focusList = el('studyFocusList');
    const reviewList = el('studyReviewList');
    const templateSelect = el('studyTemplateSelect');
    const templateCreate = el('studyTemplateCreate');

    if (!ws) {
      if (modeSave) modeSave.disabled = true;
      if (templateCreate) templateCreate.disabled = true;
      if (gamification) gamification.textContent = '';
      if (focusList) focusList.innerHTML = '';
      if (reviewList) reviewList.innerHTML = '';
      if (templateSelect) templateSelect.innerHTML = '';
      return;
    }

    if (modeSelect) modeSelect.value = ws.mode || 'build';
    if (modeSave) modeSave.disabled = false;
    if (gamification) {
      gamification.textContent = `XP: ${ws.xp || 0} • Level: ${ws.level || 1} • Streak: ${ws.streakCount || 0}`;
    }

    const focus = getWorkspaceFocus(ws);
    if (focusList) {
      if (!focus.length) {
        focusList.innerHTML = `<div class="empty-message"><p class="muted-text">No focus items yet.</p></div>`;
      } else {
        focusList.innerHTML = focus.map((f) => {
          const label = f.kind === 'item'
            ? (state.items.find(i => i.id === f.refId)?.title || 'Item')
            : (state.todos.find(t => t.id === f.refId)?.text || 'Todo');
          return `
            <div class="study-item" data-focus="${escapeHtml(f.kind)}:${escapeHtml(f.refId)}">
              <div class="study-item-header">
                <div class="study-item-title">${escapeHtml(label)}</div>
                <div class="study-item-actions">
                  <button type="button" class="btn-secondary" data-action="removeFocus">Remove</button>
                </div>
              </div>
            </div>
          `;
        }).join('');
      }
    }

    if (reviewList) {
      const now = Date.now();
      const due = (state.reviewItems || []).filter((it) => {
        const next = it.nextReviewAt ? new Date(it.nextReviewAt).getTime() : null;
        return it.reviewEnabled && next && next <= now;
      });

      if (!due.length) {
        reviewList.innerHTML = `<div class="empty-message"><p class="muted-text">Nothing due right now.</p></div>`;
      } else {
        reviewList.innerHTML = due.slice(0, 10).map((it) => {
          return `
            <div class="study-item" data-review-id="${escapeHtml(it.id)}">
              <div class="study-item-header">
                <div>
                  <div class="study-item-title">${escapeHtml(it.title || 'Untitled')}</div>
                  <div class="study-item-meta"><span class="study-pill">Review due</span></div>
                </div>
                <div class="study-item-actions">
                  <button type="button" class="btn-secondary" data-action="reviewDone">Reviewed</button>
                </div>
              </div>
            </div>
          `;
        }).join('');
      }
    }

    if (templateSelect) {
      templateSelect.innerHTML = (state.templates || []).map((t) => {
        const label = `${t.emoji ? t.emoji + ' ' : ''}${t.title}`;
        return `<option value="${escapeHtml(t.id)}">${escapeHtml(label)}</option>`;
      }).join('');
    }
    if (templateCreate) templateCreate.disabled = false;
  }

  function renderResourceResults() {
    const resEl = el('studyResourceResults');
    if (!resEl) return;

    if (!state.resourcesSearchResults.length) {
      resEl.innerHTML = `<p class="muted-text">No results yet.</p>`;
      return;
    }

    resEl.innerHTML = state.resourcesSearchResults.slice(0, 10).map((r) => {
      return `
        <div class="study-search-result" data-id="${escapeHtml(r._id)}">
          <div>
            <div class="study-item-title">${escapeHtml(r.title)}</div>
            <div class="study-muted">${escapeHtml(r.kind || '')}${r.level ? ' • ' + escapeHtml(r.level) : ''}</div>
          </div>
          <button type="button" class="btn-primary" data-action="add">Add</button>
        </div>
      `;
    }).join('');
  }

  async function loadWorkspaces() {
    const data = await api.get('/api/study/workspaces');
    state.workspaces = (data && data.items) ? data.items.map((w) => ({
      id: w._id ? String(w._id) : String(w.id),
      title: w.title,
      goal: w.goal,
      emoji: w.emoji,
      mode: w.mode,
      xp: w.xp,
      level: w.level,
      streakCount: w.streakCount,
      focusDateKey: w.focusDateKey,
      focus: Array.isArray(w.focus) ? w.focus.map((f) => ({
        kind: f.kind,
        refId: f.refId ? String(f.refId) : (f.id ? String(f.id) : ''),
        addedAt: f.addedAt,
      })).filter((f) => f.kind && f.refId) : [],
      updatedAt: w.updatedAt,
    })) : [];

    // If user has none, create one automatically (nice first-run UX).
    if (!state.workspaces.length) {
      const created = await api.post('/api/study/workspaces', { title: 'My Study Room', emoji: '📚' });
      const ws = created.workspace;
      state.workspaces = [{ id: String(ws.id), title: ws.title, goal: ws.goal, emoji: ws.emoji }];
    }

    if (!state.selectedWorkspaceId || !state.workspaces.some(w => w.id === state.selectedWorkspaceId)) {
      state.selectedWorkspaceId = state.workspaces[0].id;
    }
  }

  async function loadFolders() {
    const ws = state.selectedWorkspaceId;
    const data = await api.get(`/api/study/folders?workspaceId=${encodeURIComponent(ws)}`);
    state.folders = (data.items || []).map((f) => ({
      id: f._id ? String(f._id) : String(f.id),
      name: f.name,
      sortOrder: f.sortOrder || 0,
    }));
  }

  function computeFolderQueryParam() {
    if (!state.selectedFolderId) return '';
    if (state.selectedFolderId === '__none__') return '&folderId='; // special: no folder (handled client-side)
    return `&folderId=${encodeURIComponent(state.selectedFolderId)}`;
  }

  async function loadItems() {
    const ws = state.selectedWorkspaceId;
    let url = `/api/study/items?workspaceId=${encodeURIComponent(ws)}&status=${encodeURIComponent(state.selectedStatus)}`;

    if (state.selectedFolderId === '__none__') {
      // No-folder view: load all then filter client-side (API uses "folderId" only to match specific folder)
      const data = await api.get(url);
      const items = (data.items || []).map(normalizeItem);
      state.items = items.filter(i => !i.folderId);
      return;
    }

    if (state.selectedFolderId) url += `&folderId=${encodeURIComponent(state.selectedFolderId)}`;

    const data = await api.get(url);
    state.items = (data.items || []).map(normalizeItem);
  }

  function normalizeItem(it) {
    return {
      id: it._id ? String(it._id) : String(it.id),
      type: it.type,
      title: it.title || '',
      url: it.url || '',
      note: it.note || '',
      tags: it.tags || [],
      status: it.status,
      progressPercent: it.progressPercent || 0,
      pinned: Boolean(it.pinned),
      mastery: it.mastery || 'none',
      reviewEnabled: Boolean(it.reviewEnabled),
      reviewStage: Number.isFinite(Number(it.reviewStage)) ? Number(it.reviewStage) : 0,
      nextReviewAt: it.nextReviewAt || null,
      lastReviewedAt: it.lastReviewedAt || null,
      folderId: it.folder ? String(it.folder) : (it.folderId ? String(it.folderId) : null),
      resourceId: it.resource ? String(it.resource) : (it.resourceId ? String(it.resourceId) : null),
      documentId: it.document ? String(it.document) : (it.documentId ? String(it.documentId) : null),
      lastTouchedAt: it.lastTouchedAt,
    };
  }

  async function loadTodos() {
    const ws = state.selectedWorkspaceId;
    const itemId = state.selectedItemId;
    const hint = el('studyTodosHint');
    if (hint) hint.textContent = itemId ? 'To-dos for selected item' : 'Workspace to-dos';

    const url = itemId
      ? `/api/study/todos?workspaceId=${encodeURIComponent(ws)}&itemId=${encodeURIComponent(itemId)}`
      : `/api/study/todos?workspaceId=${encodeURIComponent(ws)}`;

    const data = await api.get(url);
    state.todos = (data.items || []).map((t) => ({
      id: t._id ? String(t._id) : String(t.id),
      text: t.text,
      done: Boolean(t.done),
      dueAt: t.dueAt,
      priority: t.priority,
      kind: t.kind,
      itemId: t.item ? String(t.item) : (t.itemId ? String(t.itemId) : null),
    }));
  }

  async function loadTemplates() {
    try {
      const data = await api.get('/api/study/templates');
      state.templates = data.items || [];
    } catch {
      state.templates = [];
    }
  }

  async function loadReviewItems() {
    try {
      const ws = state.selectedWorkspaceId;
      if (!ws) {
        state.reviewItems = [];
        return;
      }
      const data = await api.get(`/api/study/items?workspaceId=${encodeURIComponent(ws)}`);
      state.reviewItems = (data.items || []).map(normalizeItem);
    } catch {
      state.reviewItems = [];
    }
  }

  async function loadDocuments() {
    try {
      const data = await api.get('/api/documents');
      state.documents = (data.items || []).map((d) => ({
        id: d._id ? String(d._id) : String(d.id),
        label: d.label,
        originalName: d.originalName,
        createdAt: d.createdAt,
      }));
    } catch {
      state.documents = [];
    }
  }

  async function refreshAll() {
    await loadWorkspaces();
    renderWorkspaceSelect();
    await loadFolders();
    renderFolderSelect();
    await loadItems();
    renderItems();
    await loadTodos();
    renderTodos();
    await loadReviewItems();
    renderStats();
    renderEnhancements();
  }

  function wireEvents() {
    const wsSelect = el('studyWorkspaceSelect');
    if (wsSelect) {
      wsSelect.addEventListener('change', async () => {
        state.selectedWorkspaceId = wsSelect.value;
        state.selectedFolderId = '';
        state.selectedItemId = null;
        await refreshAll();
      });
    }

    const folderSelect = el('studyFolderSelect');
    if (folderSelect) {
      folderSelect.addEventListener('change', async () => {
        state.selectedFolderId = folderSelect.value;
        state.selectedItemId = null;
        await loadItems();
        renderItems();
        await loadTodos();
        renderTodos();
        renderStats();
      });
    }

    const statusSelect = el('studyStatusSelect');
    if (statusSelect) {
      statusSelect.value = state.selectedStatus;
      statusSelect.addEventListener('change', async () => {
        state.selectedStatus = statusSelect.value;
        state.selectedItemId = null;
        await loadItems();
        renderItems();
        await loadTodos();
        renderTodos();
        renderStats();
      });
    }

    const newWsBtn = el('studyNewWorkspace');
    if (newWsBtn) {
      newWsBtn.addEventListener('click', async () => {
        const title = window.prompt('Workspace name (e.g. “AWS Cloud”):', 'New Workspace');
        if (!title) return;
        const emoji = window.prompt('Optional emoji (e.g. 📘):', '');
        await api.post('/api/study/workspaces', { title, emoji });
        await loadWorkspaces();
        state.selectedWorkspaceId = state.workspaces[0].id;
        await refreshAll();
      });
    }

    const editWsBtn = el('studyEditWorkspace');
    if (editWsBtn) {
      editWsBtn.addEventListener('click', async () => {
        const ws = state.workspaces.find(w => w.id === state.selectedWorkspaceId);
        if (!ws) return;
        const nextTitle = window.prompt('Workspace name:', ws.title);
        if (!nextTitle) return;
        const nextGoal = window.prompt('Goal (optional):', ws.goal || '');
        const nextEmoji = window.prompt('Emoji (optional):', ws.emoji || '');
        await api.patch(`/api/study/workspaces/${encodeURIComponent(ws.id)}`, { title: nextTitle, goal: nextGoal || '', emoji: nextEmoji || '' });
        await refreshAll();
      });
    }

    const newFolderBtn = el('studyNewFolder');
    if (newFolderBtn) {
      newFolderBtn.addEventListener('click', async () => {
        const name = window.prompt('Folder name:', 'Week 1');
        if (!name) return;
        await api.post('/api/study/folders', { workspaceId: state.selectedWorkspaceId, name });
        await loadFolders();
        renderFolderSelect();
      });
    }

    const addLinkBtn = el('studyAddLink');
    if (addLinkBtn) {
      addLinkBtn.addEventListener('click', async () => {
        const url = window.prompt('Paste a link (http/https):', 'https://');
        if (!url) return;
        const title = window.prompt('Title (optional):', '');
        await api.post('/api/study/items', {
          workspaceId: state.selectedWorkspaceId,
          folderId: state.selectedFolderId && state.selectedFolderId !== '__none__' ? state.selectedFolderId : undefined,
          type: 'link',
          url,
          title,
          status: state.selectedStatus,
        });
        await loadItems();
        renderItems();
        renderStats();
      });
    }

    const addNoteBtn = el('studyAddNote');
    if (addNoteBtn) {
      addNoteBtn.addEventListener('click', async () => {
        const title = window.prompt('Note title (optional):', '');
        const note = window.prompt('Note text:', '');
        if (!note) return;
        await api.post('/api/study/items', {
          workspaceId: state.selectedWorkspaceId,
          folderId: state.selectedFolderId && state.selectedFolderId !== '__none__' ? state.selectedFolderId : undefined,
          type: 'note',
          title,
          note,
          status: state.selectedStatus,
        });
        await loadItems();
        renderItems();
        renderStats();
      });
    }

    const addDocBtn = el('studyAddDocument');
    if (addDocBtn) {
      addDocBtn.addEventListener('click', async () => {
        await loadDocuments();
        if (!state.documents.length) {
          window.alert('No documents found. Upload a document first in your profile/share card section.');
          return;
        }

        const list = state.documents.slice(0, 15).map((d, i) => `${i + 1}. ${d.label || d.originalName}`).join('\n');
        const pickRaw = window.prompt(`Pick a document number to add:\n\n${list}`, '1');
        const idx = Number.parseInt(pickRaw, 10) - 1;
        const doc = state.documents[idx];
        if (!doc) return;

        await api.post('/api/study/items', {
          workspaceId: state.selectedWorkspaceId,
          folderId: state.selectedFolderId && state.selectedFolderId !== '__none__' ? state.selectedFolderId : undefined,
          type: 'document',
          documentId: doc.id,
          status: state.selectedStatus,
        });
        await loadItems();
        renderItems();
        renderStats();
      });
    }

    const addResourceBtn = el('studyAddResource');
    if (addResourceBtn) {
      addResourceBtn.addEventListener('click', () => {
        const q = el('studyResourceSearch');
        if (q) q.focus();
      });
    }

    const searchBtn = el('studyResourceSearchBtn');
    if (searchBtn) {
      searchBtn.addEventListener('click', async () => {
        const q = el('studyResourceSearch');
        const term = q ? String(q.value || '').trim() : '';
        if (!term) {
          state.resourcesSearchResults = [];
          renderResourceResults();
          return;
        }
        const data = await api.get(`/api/resources?search=${encodeURIComponent(term)}&limit=10&page=1`);
        state.resourcesSearchResults = (data.items || []);
        renderResourceResults();
      });
    }

    const results = el('studyResourceResults');
    if (results) {
      results.addEventListener('click', async (e) => {
        const btn = e.target && e.target.closest('button[data-action="add"]');
        if (!btn) return;
        const row = e.target.closest('.study-search-result');
        if (!row) return;
        const resourceId = row.getAttribute('data-id');
        if (!resourceId) return;

        await api.post('/api/study/items', {
          workspaceId: state.selectedWorkspaceId,
          folderId: state.selectedFolderId && state.selectedFolderId !== '__none__' ? state.selectedFolderId : undefined,
          type: 'resource',
          resourceId,
          status: state.selectedStatus,
        });
        await loadItems();
        renderItems();
        renderStats();
      });
    }

    const itemsEl = el('studyItems');
    if (itemsEl) {
      itemsEl.addEventListener('click', async (e) => {
        const card = e.target && e.target.closest('.study-item');
        if (!card) return;
        const id = card.getAttribute('data-id');
        if (!id) return;
        state.selectedItemId = id;
        await loadTodos();
        renderTodos();
        renderStats();

        const actionBtn = e.target.closest('button[data-action]');
        if (!actionBtn) return;

        const action = actionBtn.getAttribute('data-action');

        if (action === 'focus') {
          const ws = getActiveWorkspace();
          if (!ws) return;
          const current = getWorkspaceFocus(ws);
          const next = current.concat([{ kind: 'item', refId: id }]).slice(0, 3);
          await patchWorkspaceFocus(next);
          return;
        }

        if (action === 'review') {
          await api.post(`/api/study/items/${encodeURIComponent(id)}/review`);
          await loadItems();
          renderItems();
          await loadReviewItems();
          await loadWorkspaces();
          renderEnhancements();
          renderStats();
          return;
        }

        if (action === 'reviewToggle') {
          const it = state.items.find(x => x.id === id);
          await api.patch(`/api/study/items/${encodeURIComponent(id)}`, { reviewEnabled: !it.reviewEnabled });
          await loadItems();
          renderItems();
          await loadReviewItems();
          renderEnhancements();
          return;
        }

        if (action === 'mastery') {
          const it = state.items.find(x => x.id === id);
          const order = ['none', 'understand', 'implement', 'teach'];
          const cur = (it.mastery || 'none');
          const idx = order.indexOf(cur);
          const next = order[(idx + 1) % order.length];
          await api.patch(`/api/study/items/${encodeURIComponent(id)}`, { mastery: next });
          await loadItems();
          renderItems();
          return;
        }
        if (action === 'pin') {
          const it = state.items.find(x => x.id === id);
          await api.patch(`/api/study/items/${encodeURIComponent(id)}`, { pinned: !it.pinned });
          await loadItems();
          renderItems();
          renderStats();
        }

        if (action === 'delete') {
          if (!window.confirm('Delete this item? This will also delete any attached to-dos.')) return;
          await api.del(`/api/study/items/${encodeURIComponent(id)}`);
          state.selectedItemId = null;
          await loadItems();
          renderItems();
          await loadTodos();
          renderTodos();
          renderStats();
        }

        if (action === 'edit') {
          const it = state.items.find(x => x.id === id);
          const nextTitle = window.prompt('Title:', it.title || '');
          if (nextTitle === null) return;

          if (it.type === 'note') {
            const nextNote = window.prompt('Note:', it.note || '');
            if (nextNote === null) return;
            await api.patch(`/api/study/items/${encodeURIComponent(id)}`, { title: nextTitle, note: nextNote });
          } else if (it.type === 'link') {
            const nextUrl = window.prompt('URL:', it.url || 'https://');
            if (nextUrl === null) return;
            await api.patch(`/api/study/items/${encodeURIComponent(id)}`, { title: nextTitle, url: nextUrl });
          } else {
            await api.patch(`/api/study/items/${encodeURIComponent(id)}`, { title: nextTitle });
          }

          await loadItems();
          renderItems();
          renderStats();
        }

        if (action === 'status') {
          const status = actionBtn.getAttribute('data-status');
          await api.patch(`/api/study/items/${encodeURIComponent(id)}`, { status });
          await loadItems();
          renderItems();
          renderStats();
        }
      });

      itemsEl.addEventListener('input', async (e) => {
        const range = e.target && e.target.matches('input[type="range"][data-action="progress"]') ? e.target : null;
        if (!range) return;
        const card = e.target.closest('.study-item');
        if (!card) return;
        const id = card.getAttribute('data-id');
        const v = Number(range.value || 0);
        const valueSpan = card.querySelector('.study-progress-value');
        if (valueSpan) valueSpan.textContent = `${v}%`;
        await api.patch(`/api/study/items/${encodeURIComponent(id)}`, { progressPercent: v });
      });
    }

    const todoAddBtn = el('studyTodoAddBtn');
    if (todoAddBtn) {
      todoAddBtn.addEventListener('click', async () => {
        const input = el('studyTodoText');
        const kindSelect = el('studyTodoKind');
        const text = input ? String(input.value || '').trim() : '';
        if (!text) return;
        await api.post('/api/study/todos', {
          workspaceId: state.selectedWorkspaceId,
          itemId: state.selectedItemId || undefined,
          text,
          kind: kindSelect ? kindSelect.value : 'task',
        });
        if (input) input.value = '';
        await loadTodos();
        renderTodos();
        renderStats();
      });
    }

    const todosEl = el('studyTodos');
    if (todosEl) {
      todosEl.addEventListener('click', async (e) => {
        const row = e.target && e.target.closest('.study-todo');
        if (!row) return;
        const id = row.getAttribute('data-id');
        if (!id) return;

        const btn = e.target.closest('button[data-action]');
        if (!btn) return;
        const action = btn.getAttribute('data-action');

        if (action === 'focus') {
          const ws = getActiveWorkspace();
          if (!ws) return;
          const current = getWorkspaceFocus(ws);
          const next = current.concat([{ kind: 'todo', refId: id }]).slice(0, 3);
          await patchWorkspaceFocus(next);
          return;
        }

        if (action === 'delete') {
          await api.del(`/api/study/todos/${encodeURIComponent(id)}`);
          await loadTodos();
          renderTodos();
          renderStats();
        }

        if (action === 'edit') {
          const todo = state.todos.find(t => t.id === id);
          const nextText = window.prompt('To-do:', todo.text);
          if (nextText === null) return;
          const dueAt = window.prompt('Due date (optional, YYYY-MM-DD):', todo.dueAt ? String(todo.dueAt).slice(0, 10) : '');
          const priority = window.prompt('Priority (low/normal/high):', todo.priority || 'normal');
          const kind = window.prompt('Kind (task/flashcards/practice/project/quiz):', todo.kind || 'task');
          await api.patch(`/api/study/todos/${encodeURIComponent(id)}`, {
            text: nextText,
            dueAt: dueAt || null,
            priority: priority || 'normal',
            kind: kind || (todo.kind || 'task')
          });
          await loadTodos();
          renderTodos();
          renderStats();
        }
      });

      todosEl.addEventListener('change', async (e) => {
        const checkbox = e.target && e.target.matches('input[type="checkbox"][data-action="toggle"]') ? e.target : null;
        if (!checkbox) return;
        const row = checkbox.closest('.study-todo');
        if (!row) return;
        const id = row.getAttribute('data-id');
        await api.patch(`/api/study/todos/${encodeURIComponent(id)}`, { done: checkbox.checked });
        await loadTodos();
        renderTodos();
        renderStats();
      });
    }

    const modeSave = el('studyModeSave');
    if (modeSave) {
      modeSave.addEventListener('click', async () => {
        const ws = getActiveWorkspace();
        const modeSelect = el('studyModeSelect');
        if (!ws || !modeSelect) return;
        await api.patch(`/api/study/workspaces/${encodeURIComponent(ws.id)}`, { mode: modeSelect.value });
        await loadWorkspaces();
        renderWorkspaceSelect();
        renderEnhancements();
      });
    }

    const enhancements = el('studyEnhancements');
    if (enhancements) {
      enhancements.addEventListener('click', async (e) => {
        const btn = e.target && e.target.closest('button[data-action]');
        if (!btn) return;

        if (btn.getAttribute('data-action') === 'removeFocus') {
          const row = btn.closest('[data-focus]');
          const ws = getActiveWorkspace();
          if (!row || !ws) return;
          const raw = row.getAttribute('data-focus') || '';
          const parts = raw.split(':');
          const kind = parts[0];
          const refId = parts[1];
          const current = getWorkspaceFocus(ws);
          const next = current.filter((f) => !(f.kind === kind && f.refId === refId));
          await patchWorkspaceFocus(next);
        }

        if (btn.getAttribute('data-action') === 'reviewDone') {
          const row = btn.closest('[data-review-id]');
          const id = row ? row.getAttribute('data-review-id') : '';
          if (!id) return;
          await api.post(`/api/study/items/${encodeURIComponent(id)}/review`);
          await loadReviewItems();
          await loadItems();
          renderItems();
          await loadWorkspaces();
          renderEnhancements();
        }
      });
    }

    const templateCreate = el('studyTemplateCreate');
    if (templateCreate) {
      templateCreate.addEventListener('click', async () => {
        const sel = el('studyTemplateSelect');
        const templateId = sel ? sel.value : '';
        if (!templateId) return;
        await api.post('/api/study/workspaces/from-template', { templateId });
        await refreshAll();
      });
    }
  }

  async function init() {
    const ok = await ensureSignedIn();
    if (!ok) return;

    renderSkeleton();
    try {
      await loadTemplates();
      await refreshAll();
      wireEvents();
    } catch (e) {
      const container = el('studyContainer');
      if (container) {
        container.innerHTML = `
          <div class="empty-message">
            <h2>Study Room error</h2>
            <p>${escapeHtml(e && e.message ? e.message : 'Failed to load Study Room')}</p>
          </div>
        `;
      }
    }
  }

  window.addEventListener('DOMContentLoaded', init);
})();
