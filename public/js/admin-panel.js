/**
 * public/js/admin-panel.js
 *
 * Admin panel UI.
 *
 * The admin panel surfaces role/permission guarded actions such as:
 * - Tag management
 * - Resource management
 * - Pathways content editing
 * - Audit log viewing (when permitted)
 */
(function () {
  const PERM_ADMIN_ACCESS = 'admin:access';
  const PERM_AUDIT_READ = 'audit:read';
  const PERM_TAGS_MANAGE = 'tags:manage';
  const PERM_RESOURCES_READ = 'resources:read';
  const PERM_RESOURCES_CREATE = 'resources:create';
  const PERM_RESOURCES_UPDATE = 'resources:update';
  const PERM_RESOURCES_DELETE = 'resources:delete';
  const PERM_PATHWAYS_MANAGE = 'pathways:manage';

  const el = (id) => document.getElementById(id);

  const show = (msg, type = 'info') => {
    if (typeof window.showMessage === 'function') {
      window.showMessage(msg, type);
    } else {
      // Fallback
      console[type === 'error' ? 'error' : 'log'](msg);
    }
  };

  const hasPerm = (user, perm) => {
    const perms = user?.permissions || [];
    return Boolean(user?.isSuperAdmin) || perms.includes(perm);
  };

  const state = {
    permissionGroups: [],
    roles: [],
    selectedRoleId: null,
    users: [],
    selectedUser: null,
    tags: [],
    selectedTagId: null,
    resources: [],
    selectedResourceId: null,
    pathways: {
      html: '',
      updatedAt: null,
    },
    audit: {
      items: [],
      currentPage: 1,
      totalPages: 1,
      limit: 50,
    },
  };

  const api = {
    async getPermissions() {
      const res = await fetch('/api/admin/permissions');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load permissions');
      return data;
    },
    async getRoles() {
      const res = await fetch('/api/admin/roles');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load roles');
      return data;
    },
    async createRole(payload) {
      const res = await fetch('/api/admin/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create role');
      return data;
    },
    async updateRole(id, payload) {
      const res = await fetch(`/api/admin/roles/${encodeURIComponent(id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update role');
      return data;
    },
    async deleteRole(id) {
      const res = await fetch(`/api/admin/roles/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete role');
      return data;
    },
    async searchUsers(search) {
      const url = new URL('/api/admin/users', window.location.origin);
      url.searchParams.set('limit', '25');
      if (search) url.searchParams.set('search', search);
      const res = await fetch(url.toString());
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load users');
      return data;
    },
    async setUserRoles(userId, roleIds) {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(userId)}/roles`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roleIds }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update user roles');
      return data;
    },
    async setSuperAdmin(userId, enabled) {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(userId)}/superadmin`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update superadmin');
      return data;
    },
    async getAudit(params = {}) {
      const url = new URL('/api/admin/audit', window.location.origin);
      if (params.page) url.searchParams.set('page', String(params.page));
      if (params.limit) url.searchParams.set('limit', String(params.limit));
      if (params.action) url.searchParams.set('action', String(params.action));

      const res = await fetch(url.toString());
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load audit logs');
      return data;
    },

    // Tags
    async getTagsAdmin() {
      const res = await fetch('/api/tags/admin');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load tags');
      return data;
    },
    async createTag(payload) {
      const res = await fetch('/api/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create tag');
      return data;
    },
    async updateTag(id, payload) {
      const res = await fetch(`/api/tags/${encodeURIComponent(id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update tag');
      return data;
    },
    async deleteTag(id) {
      const res = await fetch(`/api/tags/${encodeURIComponent(id)}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete tag');
      return data;
    },

    // Resources
    async getResourcesAdmin() {
      const res = await fetch('/api/resources/admin');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load resources');
      return data;
    },
    async createResourceLink(payload) {
      const res = await fetch('/api/resources/links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create resource');
      return data;
    },
    async uploadResourcePdf(formData) {
      const res = await fetch('/api/resources/pdf', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to upload PDF');
      return data;
    },
    async updateResource(id, payload) {
      const res = await fetch(`/api/resources/${encodeURIComponent(id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update resource');
      return data;
    },
    async deleteResource(id) {
      const res = await fetch(`/api/resources/${encodeURIComponent(id)}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete resource');
      return data;
    },

    // Site content (Pathways)
    async getSiteContent(slug) {
      const res = await fetch(`/api/site-content/${encodeURIComponent(slug)}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to load site content');
      return data;
    },
    async updateSiteContent(slug, html) {
      const res = await fetch(`/api/site-content/${encodeURIComponent(slug)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ html }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to update site content');
      return data;
    },
  };

  const parseSlugCsv = (input) => {
    const s = String(input || '').trim().toLowerCase();
    if (!s) return [];
    const parts = s.split(',').map(p => p.trim()).filter(Boolean);
    return Array.from(new Set(parts)).slice(0, 12);
  };

  const renderTags = () => {
    const container = el('tagsSection');
    if (!container) return;

    const user = window.auth?.currentUser;
    if (!user || !hasPerm(user, PERM_ADMIN_ACCESS)) {
      container.innerHTML = '<p class="empty-message">Admin access required.</p>';
      return;
    }

    if (!hasPerm(user, PERM_TAGS_MANAGE)) {
      container.innerHTML = '<p class="empty-message">Only admins can manage tags.</p>';
      return;
    }

    const selected = state.tags.find(t => t._id === state.selectedTagId) || null;

    const list = state.tags.length
      ? state.tags.map(t => {
        const status = t.isActive ? '' : ' <em>(inactive)</em>';
        return `
          <div style="display:flex; justify-content:space-between; align-items:center; gap: 12px; padding: 10px 0; border-top: 1px solid rgba(0,0,0,0.08);">
            <div>
              <div><strong>${escapeHtml(t.name)}</strong> <span style="opacity:0.7;">(${escapeHtml(t.slug)})</span>${status}</div>
              <div style="opacity:0.8; font-size: 0.95em;">${escapeHtml(t.category || '')}</div>
              <div style="opacity:0.7; font-size: 0.9em;">${escapeHtml(t.description || '')}</div>
            </div>
            <div style="display:flex; gap: 8px;">
              <button class="btn-primary" type="button" data-action="edit-tag" data-id="${t._id}">Edit</button>
              <button class="btn-primary" type="button" data-action="delete-tag" data-id="${t._id}" style="background:#333;">Delete</button>
            </div>
          </div>
        `;
      }).join('')
      : '<p class="empty-message">No tags yet.</p>';

    container.innerHTML = `
      <div style="margin-bottom: 14px;">
        <form id="tagForm">
          <input type="hidden" name="tagId" value="${state.selectedTagId || ''}" />
          <div class="form-group">
            <label>Name</label>
            <input type="text" name="name" required placeholder="e.g. Docker" value="${selected ? escapeHtml(selected.name) : ''}" />
          </div>
          <div class="form-group">
            <label>Slug</label>
            <input type="text" name="slug" placeholder="e.g. docker" value="${selected ? escapeHtml(selected.slug) : ''}" />
            <div style="opacity:0.7; font-size: 0.9em; margin-top: 6px;">Use lowercase slugs (letters/numbers/dashes).</div>
          </div>
          <div class="form-group">
            <label>Category</label>
            <input type="text" name="category" placeholder="e.g. devops" value="${selected ? escapeHtml(selected.category) : ''}" />
          </div>
          <div class="form-group">
            <label>Description</label>
            <textarea name="description" maxlength="240" placeholder="Short description">${selected ? escapeHtml(selected.description || '') : ''}</textarea>
          </div>
          <div style="display:flex; gap: 10px; align-items:center; margin-bottom: 10px;">
            <label style="display:flex; gap: 8px; align-items:center;">
              <input type="checkbox" id="tagIsActive" ${selected ? (selected.isActive ? 'checked' : '') : 'checked'} />
              <span>Active</span>
            </label>
          </div>
          <div style="display:flex; gap: 10px;">
            <button type="submit" class="btn-primary">${state.selectedTagId ? 'Save Tag' : 'Create Tag'}</button>
            ${state.selectedTagId ? '<button type="button" class="btn-primary" id="cancelTagEdit" style="background:#333;">Cancel</button>' : ''}
            <button type="button" class="btn-primary" id="refreshTagsBtn" style="background:#333;">Refresh</button>
          </div>
        </form>
      </div>

      <h4 style="margin-top: 18px;">Existing Tags</h4>
      ${list}
    `;

    const form = el('tagForm');
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
          const name = String(form.querySelector('input[name="name"]')?.value || '').trim();
          const slug = String(form.querySelector('input[name="slug"]')?.value || '').trim();
          const category = String(form.querySelector('input[name="category"]')?.value || '').trim();
          const description = String(form.querySelector('textarea[name="description"]')?.value || '').trim();
          const isActive = Boolean(el('tagIsActive')?.checked);

          const payload = { name, category, description, isActive };
          if (slug) payload.slug = slug;

          if (state.selectedTagId) {
            await api.updateTag(state.selectedTagId, payload);
            show('Tag updated', 'success');
          } else {
            await api.createTag(payload);
            show('Tag created', 'success');
          }

          state.selectedTagId = null;
          await refreshTags();
        } catch (err) {
          show(String(err.message || err), 'error');
        }
      });
    }

    const cancel = el('cancelTagEdit');
    if (cancel) {
      cancel.addEventListener('click', () => {
        state.selectedTagId = null;
        renderTags();
      });
    }

    const refreshBtn = el('refreshTagsBtn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', async () => {
        try {
          await refreshTags();
          show('Tags refreshed', 'success');
        } catch (e) {
          show(String(e.message || e), 'error');
        }
      });
    }

    container.querySelectorAll('[data-action="edit-tag"]').forEach(btn => {
      btn.addEventListener('click', () => {
        state.selectedTagId = btn.getAttribute('data-id');
        renderTags();
      });
    });

    container.querySelectorAll('[data-action="delete-tag"]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        const tag = state.tags.find(t => t._id === id);
        if (!tag) return;
        if (!confirm(`Delete tag "${tag.name}" (${tag.slug})?`)) return;
        try {
          await api.deleteTag(id);
          show('Tag deleted', 'success');
          if (state.selectedTagId === id) state.selectedTagId = null;
          await refreshTags();
        } catch (e) {
          show(String(e.message || e), 'error');
        }
      });
    });
  };

  const renderPathways = () => {
    const container = el('pathwaysSection');
    if (!container) return;

    const user = window.auth?.currentUser;
    if (!user || !hasPerm(user, PERM_ADMIN_ACCESS)) {
      container.innerHTML = '<p class="empty-message">Admin access required.</p>';
      return;
    }

    if (!hasPerm(user, PERM_PATHWAYS_MANAGE)) {
      container.innerHTML = '<p class="empty-message">Only Content/Admin can edit IT Pathways.</p>';
      return;
    }

    const updated = state.pathways.updatedAt ? new Date(state.pathways.updatedAt).toLocaleString() : '—';

    container.innerHTML = `
      <div style="display:flex; gap: 10px; align-items:center; flex-wrap: wrap; margin-bottom: 10px;">
        <button type="button" class="btn-primary" id="refreshPathwaysBtn">Refresh</button>
        <button type="button" class="btn-primary" id="savePathwaysBtn">Save</button>
        <span style="opacity:0.75; font-size: 0.92em;">Last updated: ${escapeHtml(updated)}</span>
        <a href="/pathways" style="margin-left:auto;">Open public page</a>
      </div>

      <label style="display:block; opacity:0.85; margin-bottom:6px;">HTML (rendered inside the Pathways page)</label>
      <textarea id="pathwaysHtmlInput" rows="18" style="width:100%;">${escapeHtml(state.pathways.html || '')}</textarea>
      <small style="opacity:0.75; display:block; margin-top:6px;">Tip: keep the existing class names so styling stays consistent.</small>
    `;

    const refreshBtn = el('refreshPathwaysBtn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', async () => {
        try {
          await refreshPathways();
          show('Pathways refreshed', 'success');
        } catch (e) {
          show(String(e.message || e), 'error');
        }
      });
    }

    const saveBtn = el('savePathwaysBtn');
    if (saveBtn) {
      saveBtn.addEventListener('click', async () => {
        try {
          const input = el('pathwaysHtmlInput');
          const html = String(input?.value || '').trim();
          if (!html) {
            show('HTML is required', 'error');
            return;
          }
          saveBtn.disabled = true;
          const res = await api.updateSiteContent('pathways', html);
          state.pathways.html = res?.content?.html || html;
          state.pathways.updatedAt = res?.content?.updatedAt || new Date().toISOString();
          renderPathways();
          show('Pathways updated', 'success');
        } catch (e) {
          show(String(e.message || e), 'error');
        } finally {
          saveBtn.disabled = false;
        }
      });
    }
  };

  const renderResources = () => {
    const container = el('resourcesSection');
    if (!container) return;

    const user = window.auth?.currentUser;
    if (!user || !hasPerm(user, PERM_ADMIN_ACCESS)) {
      container.innerHTML = '<p class="empty-message">Admin access required.</p>';
      return;
    }

    if (!hasPerm(user, PERM_RESOURCES_READ)) {
      container.innerHTML = '<p class="empty-message">Missing permission: resources:read</p>';
      return;
    }

    const selected = state.resources.find(r => r._id === state.selectedResourceId) || null;
    const canCreate = hasPerm(user, PERM_RESOURCES_CREATE);
    const canUpdate = hasPerm(user, PERM_RESOURCES_UPDATE);
    const canDelete = hasPerm(user, PERM_RESOURCES_DELETE);

    const list = state.resources.length
      ? state.resources.map(r => {
        const status = r.isActive ? '' : ' <em>(inactive)</em>';
        const by = r.createdBy?.username ? ` • by ${escapeHtml(r.createdBy.username)}` : '';
        const tagStr = Array.isArray(r.tags) ? r.tags.join(', ') : '';
        const where = r.url ? escapeHtml(r.url) : (r.fileUrl ? escapeHtml(r.fileUrl) : '');
        return `
          <div style="display:flex; justify-content:space-between; align-items:center; gap: 12px; padding: 10px 0; border-top: 1px solid rgba(0,0,0,0.08);">
            <div style="min-width:0;">
              <div style="display:flex; gap: 8px; flex-wrap: wrap; align-items: baseline;">
                <strong>${escapeHtml(r.title)}</strong>${status}
                <span style="opacity:0.7;">(${escapeHtml(r.kind)} • ${escapeHtml(r.level)})${by}</span>
              </div>
              <div style="opacity:0.75; font-size: 0.9em; word-break: break-word;">${where}</div>
              <div style="opacity:0.7; font-size: 0.9em;">Tags: ${escapeHtml(tagStr || 'None')}</div>
            </div>
            <div style="display:flex; gap: 8px; flex-shrink:0;">
              <button class="btn-primary" type="button" data-action="select-resource" data-id="${r._id}">Select</button>
              ${canDelete ? `<button class="btn-primary" type="button" data-action="delete-resource" data-id="${r._id}" style="background:#333;">Delete</button>` : ''}
            </div>
          </div>
        `;
      }).join('')
      : '<p class="empty-message">No resources yet.</p>';

    const selectedTags = selected ? (Array.isArray(selected.tags) ? selected.tags.join(', ') : '') : '';
    const selectedUrl = selected ? (selected.url || '') : '';
    const selectedIsPdf = selected ? (selected.kind === 'pdf' || Boolean(selected.fileUrl)) : false;

    container.innerHTML = `
      <div style="display:flex; gap: 10px; align-items:center; margin-bottom: 12px;">
        <button type="button" class="btn-primary" id="refreshResourcesBtn" style="background:#333;">Refresh</button>
        ${state.selectedResourceId ? '<button type="button" class="btn-primary" id="clearSelectedResourceBtn" style="background:#333;">Clear selection</button>' : ''}
      </div>

      ${canCreate ? `
        <div style="margin-bottom: 14px; padding-bottom: 14px; border-bottom: 1px solid rgba(0,0,0,0.08);">
          <h4>Create Link Resource</h4>
          <form id="resourceLinkForm">
            <div class="form-group">
              <label>Title</label>
              <input type="text" name="title" required placeholder="e.g. web.dev Learn" />
            </div>
            <div class="form-group">
              <label>URL</label>
              <input type="text" name="url" required placeholder="https://..." />
            </div>
            <div class="form-group">
              <label>Kind</label>
              <select name="kind">
                <option value="documentation">documentation</option>
                <option value="course">course</option>
                <option value="video">video</option>
                <option value="article">article</option>
                <option value="practice">practice</option>
                <option value="tool">tool</option>
              </select>
            </div>
            <div class="form-group">
              <label>Level</label>
              <select name="level">
                <option value="all">all</option>
                <option value="beginner">beginner</option>
                <option value="intermediate">intermediate</option>
                <option value="advanced">advanced</option>
              </select>
            </div>
            <div class="form-group">
              <label>Tags (comma-separated slugs)</label>
              <input type="text" name="tags" placeholder="e.g. html, css, javascript" />
            </div>
            <div class="form-group">
              <label>Description</label>
              <textarea name="description" maxlength="2000" placeholder="Optional"></textarea>
            </div>
            <button type="submit" class="btn-primary">Create Link Resource</button>
          </form>

          <h4 style="margin-top: 18px;">Upload PDF Resource</h4>
          <form id="resourcePdfForm">
            <div class="form-group">
              <label>PDF file</label>
              <input type="file" name="file" accept="application/pdf" required />
            </div>
            <div class="form-group">
              <label>Title</label>
              <input type="text" name="title" placeholder="Optional (defaults to filename)" />
            </div>
            <div class="form-group">
              <label>Level</label>
              <select name="level">
                <option value="all">all</option>
                <option value="beginner">beginner</option>
                <option value="intermediate">intermediate</option>
                <option value="advanced">advanced</option>
              </select>
            </div>
            <div class="form-group">
              <label>Tags (comma-separated slugs)</label>
              <input type="text" name="tags" placeholder="e.g. api, security" />
            </div>
            <div class="form-group">
              <label>Description</label>
              <textarea name="description" maxlength="2000" placeholder="Optional"></textarea>
            </div>
            <button type="submit" class="btn-primary">Upload PDF</button>
          </form>
        </div>
      ` : '<p class="empty-message">Only Content roles can create/upload resources.</p>'}

      ${canUpdate && selected ? `
        <div style="margin-bottom: 14px; padding-bottom: 14px; border-bottom: 1px solid rgba(0,0,0,0.08);">
          <h4>Edit Selected Resource</h4>
          <form id="resourceEditForm">
            <div style="opacity:0.8; margin-bottom: 8px;">Selected: <strong>${escapeHtml(selected.title)}</strong></div>
            <div class="form-group">
              <label>Title</label>
              <input type="text" name="title" value="${escapeHtml(selected.title)}" required />
            </div>
            <div class="form-group">
              <label>Description</label>
              <textarea name="description" maxlength="2000">${escapeHtml(selected.description || '')}</textarea>
            </div>
            <div class="form-group">
              <label>Kind</label>
              <input type="text" name="kind" value="${escapeHtml(selected.kind)}" ${selectedIsPdf ? 'readonly' : ''} />
              ${selectedIsPdf ? '<div style="opacity:0.7; font-size: 0.9em; margin-top: 6px;">PDF kind is fixed.</div>' : ''}
            </div>
            <div class="form-group">
              <label>Level</label>
              <input type="text" name="level" value="${escapeHtml(selected.level)}" />
            </div>
            <div class="form-group">
              <label>URL</label>
              <input type="text" name="url" value="${escapeHtml(selectedUrl)}" ${selectedIsPdf ? 'readonly' : ''} />
              ${selectedIsPdf ? '<div style="opacity:0.7; font-size: 0.9em; margin-top: 6px;">PDF resources use a file URL.</div>' : ''}
            </div>
            <div class="form-group">
              <label>Tags (comma-separated slugs)</label>
              <input type="text" name="tags" value="${escapeHtml(selectedTags)}" />
            </div>
            <div style="display:flex; gap: 10px; align-items:center; margin-bottom: 10px;">
              <label style="display:flex; gap: 8px; align-items:center;">
                <input type="checkbox" id="resourceIsActive" ${selected.isActive ? 'checked' : ''} />
                <span>Active</span>
              </label>
            </div>
            <button type="submit" class="btn-primary">Save Resource</button>
          </form>
        </div>
      ` : ''}

      <h4 style="margin-top: 18px;">Existing Resources</h4>
      ${list}
    `;

    const refreshBtn = el('refreshResourcesBtn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', async () => {
        try {
          await refreshResources();
          show('Resources refreshed', 'success');
        } catch (e) {
          show(String(e.message || e), 'error');
        }
      });
    }

    const clearBtn = el('clearSelectedResourceBtn');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        state.selectedResourceId = null;
        renderResources();
      });
    }

    const linkForm = el('resourceLinkForm');
    if (linkForm) {
      linkForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
          const title = String(linkForm.querySelector('input[name="title"]')?.value || '').trim();
          const url = String(linkForm.querySelector('input[name="url"]')?.value || '').trim();
          const kind = String(linkForm.querySelector('select[name="kind"]')?.value || 'documentation').trim();
          const level = String(linkForm.querySelector('select[name="level"]')?.value || 'all').trim();
          const description = String(linkForm.querySelector('textarea[name="description"]')?.value || '').trim();
          const tags = parseSlugCsv(String(linkForm.querySelector('input[name="tags"]')?.value || ''));

          await api.createResourceLink({ title, url, kind, level, description, tags });
          show('Resource created', 'success');
          linkForm.reset();
          await refreshResources();
        } catch (err) {
          show(String(err.message || err), 'error');
        }
      });
    }

    const pdfForm = el('resourcePdfForm');
    if (pdfForm) {
      pdfForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
          const fileInput = pdfForm.querySelector('input[name="file"]');
          const file = fileInput?.files?.[0];
          if (!file) {
            show('Select a PDF first', 'error');
            return;
          }

          const title = String(pdfForm.querySelector('input[name="title"]')?.value || '').trim();
          const level = String(pdfForm.querySelector('select[name="level"]')?.value || 'all').trim();
          const description = String(pdfForm.querySelector('textarea[name="description"]')?.value || '').trim();
          const tags = parseSlugCsv(String(pdfForm.querySelector('input[name="tags"]')?.value || ''));

          const fd = new FormData();
          fd.append('file', file);
          if (title) fd.append('title', title);
          if (level) fd.append('level', level);
          if (description) fd.append('description', description);
          if (tags.length) fd.append('tags', JSON.stringify(tags));

          await api.uploadResourcePdf(fd);
          show('PDF uploaded', 'success');
          pdfForm.reset();
          await refreshResources();
        } catch (err) {
          show(String(err.message || err), 'error');
        }
      });
    }

    const editForm = el('resourceEditForm');
    if (editForm && selected) {
      editForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
          const title = String(editForm.querySelector('input[name="title"]')?.value || '').trim();
          const description = String(editForm.querySelector('textarea[name="description"]')?.value || '').trim();
          const kind = String(editForm.querySelector('input[name="kind"]')?.value || '').trim();
          const level = String(editForm.querySelector('input[name="level"]')?.value || '').trim();
          const url = String(editForm.querySelector('input[name="url"]')?.value || '').trim();
          const tags = parseSlugCsv(String(editForm.querySelector('input[name="tags"]')?.value || ''));
          const isActive = Boolean(el('resourceIsActive')?.checked);

          await api.updateResource(selected._id, { title, description, kind, level, url, tags, isActive });
          show('Resource updated', 'success');
          await refreshResources();
        } catch (err) {
          show(String(err.message || err), 'error');
        }
      });
    }

    container.querySelectorAll('[data-action="select-resource"]').forEach(btn => {
      btn.addEventListener('click', () => {
        state.selectedResourceId = btn.getAttribute('data-id');
        renderResources();
      });
    });

    container.querySelectorAll('[data-action="delete-resource"]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        const r = state.resources.find(x => x._id === id);
        if (!r) return;
        if (!confirm(`Delete resource "${r.title}"?`)) return;
        try {
          await api.deleteResource(id);
          show('Resource deleted', 'success');
          if (state.selectedResourceId === id) state.selectedResourceId = null;
          await refreshResources();
        } catch (e) {
          show(String(e.message || e), 'error');
        }
      });
    });
  };

  const formatDateTime = (iso) => {
    try {
      const d = new Date(iso);
      if (Number.isNaN(d.getTime())) return '';
      return d.toLocaleString();
    } catch {
      return '';
    }
  };

  const renderAudit = () => {
    const container = el('auditSection');
    if (!container) return;

    const user = window.auth?.currentUser;
    if (!user || !hasPerm(user, PERM_ADMIN_ACCESS)) {
      container.innerHTML = '<p class="empty-message">Admin access required.</p>';
      return;
    }

    if (!hasPerm(user, PERM_AUDIT_READ)) {
      container.innerHTML = '<p class="empty-message">Missing permission: audit:read</p>';
      return;
    }

    const rows = (state.audit.items || []).map(item => {
      const actor = item?.actor?.username || '';
      const action = item?.action || '';
      const targetUser = item?.targetUser?.username || '';
      const targetRole = item?.targetRole?.name || '';
      const when = formatDateTime(item?.createdAt);

      return `
        <tr>
          <td style="padding: 8px; border-top: 1px solid rgba(0,0,0,0.08);">${escapeHtml(when)}</td>
          <td style="padding: 8px; border-top: 1px solid rgba(0,0,0,0.08);">${escapeHtml(actor)}</td>
          <td style="padding: 8px; border-top: 1px solid rgba(0,0,0,0.08);">${escapeHtml(action)}</td>
          <td style="padding: 8px; border-top: 1px solid rgba(0,0,0,0.08);">${escapeHtml(targetUser)}</td>
          <td style="padding: 8px; border-top: 1px solid rgba(0,0,0,0.08);">${escapeHtml(targetRole)}</td>
        </tr>
      `;
    }).join('');

    container.innerHTML = `
      <div style="display:flex; gap: 10px; align-items:center; margin-bottom: 12px;">
        <button type="button" class="btn-primary" id="refreshAuditBtn">Refresh</button>
        <div style="opacity:0.7;">Page ${state.audit.currentPage} / ${state.audit.totalPages}</div>
      </div>
      <div style="overflow:auto;">
        <table style="width:100%; border-collapse: collapse;">
          <thead>
            <tr>
              <th style="text-align:left; padding: 8px; border-bottom: 1px solid rgba(0,0,0,0.12);">When</th>
              <th style="text-align:left; padding: 8px; border-bottom: 1px solid rgba(0,0,0,0.12);">Actor</th>
              <th style="text-align:left; padding: 8px; border-bottom: 1px solid rgba(0,0,0,0.12);">Action</th>
              <th style="text-align:left; padding: 8px; border-bottom: 1px solid rgba(0,0,0,0.12);">Target User</th>
              <th style="text-align:left; padding: 8px; border-bottom: 1px solid rgba(0,0,0,0.12);">Target Role</th>
            </tr>
          </thead>
          <tbody>
            ${rows || `<tr><td colspan="5" style="padding: 8px; opacity:0.7;">No audit events yet.</td></tr>`}
          </tbody>
        </table>
      </div>
    `;

    const refreshBtn = el('refreshAuditBtn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', async () => {
        try {
          await refreshAudit();
          show('Audit refreshed', 'success');
        } catch (e) {
          show(String(e.message || e), 'error');
        }
      });
    }
  };

  const refreshAudit = async () => {
    const data = await api.getAudit({ page: 1, limit: state.audit.limit });
    state.audit.items = data.items || [];
    state.audit.currentPage = Number(data.currentPage || 1);
    state.audit.totalPages = Number(data.totalPages || 1);
    state.audit.limit = Number(data.limit || state.audit.limit);
    renderAudit();
  };

  const renderPermissionsChecklist = (selected = []) => {
    const selectedSet = new Set(selected);

    return state.permissionGroups.map(group => {
      const items = group.permissions.map(p => {
        const checked = selectedSet.has(p) ? 'checked' : '';
        const safeId = `perm_${p.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
        return `
          <label style="display:block; margin: 6px 0;">
            <input type="checkbox" data-perm="${p}" id="${safeId}" ${checked} />
            <span style="margin-left: 8px;">${p}</span>
          </label>
        `;
      }).join('');

      return `
        <div style="margin: 14px 0; padding: 10px 0; border-top: 1px solid rgba(0,0,0,0.08);">
          <strong>${group.group}</strong>
          <div style="margin-top: 8px;">${items}</div>
        </div>
      `;
    }).join('');
  };

  const renderRoles = () => {
    const container = el('rolesSection');
    if (!container) return;

    const rolesList = state.roles.length
      ? state.roles.map(r => {
        const sys = r.isSystem ? ' <em>(system)</em>' : '';
        const permCount = Array.isArray(r.permissions) ? r.permissions.length : 0;
        return `
          <div style="display:flex; justify-content:space-between; align-items:center; gap: 12px; padding: 10px 0; border-top: 1px solid rgba(0,0,0,0.08);">
            <div>
              <div><strong>${escapeHtml(r.name)}</strong>${sys}</div>
              <div style="opacity:0.8; font-size: 0.95em;">${escapeHtml(r.description || '')}</div>
              <div style="opacity:0.7; font-size: 0.9em;">${permCount} permission(s)</div>
            </div>
            <div style="display:flex; gap: 8px;">
              <button class="btn-primary" type="button" data-action="edit-role" data-id="${r._id}">Edit</button>
              <button class="btn-primary" type="button" data-action="delete-role" data-id="${r._id}" style="background:#333;">Delete</button>
            </div>
          </div>
        `;
      }).join('')
      : '<p class="empty-message">No roles yet.</p>';

    container.innerHTML = `
      <div style="margin-bottom: 14px;">
        <form id="roleForm">
          <input type="hidden" name="roleId" value="${state.selectedRoleId || ''}" />
          <div class="form-group">
            <label>Role name</label>
            <input type="text" name="name" required placeholder="e.g. Content Moderator" value="${getSelectedRole()?.name ? escapeHtml(getSelectedRole().name) : ''}" />
          </div>
          <div class="form-group">
            <label>Description</label>
            <textarea name="description" maxlength="500" placeholder="What can this role do?">${getSelectedRole()?.description ? escapeHtml(getSelectedRole().description) : ''}</textarea>
          </div>
          <div class="form-group">
            <label>Permissions</label>
            <div id="permissionsChecklist">
              ${renderPermissionsChecklist(getSelectedRole()?.permissions || [])}
            </div>
          </div>
          <div style="display:flex; gap: 10px;">
            <button type="submit" class="btn-primary">${state.selectedRoleId ? 'Save Role' : 'Create Role'}</button>
            ${state.selectedRoleId ? '<button type="button" class="btn-primary" id="cancelRoleEdit" style="background:#333;">Cancel</button>' : ''}
          </div>
        </form>
      </div>

      <h4 style="margin-top: 18px;">Existing Roles</h4>
      ${rolesList}
    `;

    const form = el('roleForm');
    if (form) {
      form.addEventListener('submit', onSubmitRole);
    }

    const cancel = el('cancelRoleEdit');
    if (cancel) {
      cancel.addEventListener('click', () => {
        state.selectedRoleId = null;
        renderRoles();
      });
    }

    container.querySelectorAll('[data-action="edit-role"]').forEach(btn => {
      btn.addEventListener('click', () => {
        state.selectedRoleId = btn.getAttribute('data-id');
        renderRoles();
      });
    });

    container.querySelectorAll('[data-action="delete-role"]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        const role = state.roles.find(r => r._id === id);
        if (!role) return;
        if (!confirm(`Delete role "${role.name}"?`)) return;
        try {
          await api.deleteRole(id);
          show('Role deleted', 'success');
          state.selectedRoleId = null;
          await refreshRoles();
        } catch (e) {
          show(String(e.message || e), 'error');
        }
      });
    });
  };

  const renderUsers = () => {
    const container = el('usersSection');
    if (!container) return;

    const selected = state.selectedUser;

    const roleOptions = state.roles.map(r => {
      const checked = selected?.roles?.some(ur => String(ur?._id || ur) === String(r._id)) ? 'checked' : '';
      const safeId = `role_${r._id}`;
      return `
        <label style="display:block; margin: 6px 0;">
          <input type="checkbox" id="${safeId}" data-role-id="${r._id}" ${checked} />
          <span style="margin-left: 8px;">${escapeHtml(r.name)}</span>
        </label>
      `;
    }).join('');

    container.innerHTML = `
      <div style="display:flex; gap: 10px; align-items:center; margin-bottom: 12px;">
        <input type="text" id="userSearch" placeholder="Search username or email" style="flex:1;" />
        <button type="button" class="btn-primary" id="searchUsersBtn">Search</button>
      </div>

      <div id="userSearchResults"></div>

      <div style="margin-top: 16px;">
        <h4>Selected User</h4>
        ${selected ? `
          <div style="margin: 10px 0;">
            <div><strong>${escapeHtml(selected.username)}</strong> <span style="opacity:0.7;">(${escapeHtml(selected.email)})</span></div>
            <div style="opacity:0.8;">Superadmin: <strong>${selected.isSuperAdmin ? 'Yes' : 'No'}</strong></div>
          </div>
          <div class="form-group">
            <label>Roles</label>
            <div id="userRolesChecklist">${roleOptions || '<p class="empty-message">No roles exist yet.</p>'}</div>
          </div>
          <div style="display:flex; gap: 10px; align-items:center;">
            <button type="button" class="btn-primary" id="saveUserRolesBtn">Save Roles</button>
            ${window.auth?.currentUser?.isSuperAdmin ? `
              <label style="display:flex; gap: 8px; align-items:center;">
                <input type="checkbox" id="superAdminToggle" ${selected.isSuperAdmin ? 'checked' : ''} />
                <span>Superadmin</span>
              </label>
              <button type="button" class="btn-primary" id="saveSuperAdminBtn" style="background:#333;">Save Superadmin</button>
            ` : ''}
          </div>
        ` : '<p class="empty-message">Search and select a user to manage roles.</p>'}
      </div>
    `;

    const searchBtn = el('searchUsersBtn');
    if (searchBtn) {
      searchBtn.addEventListener('click', doUserSearch);
    }

    const searchInput = el('userSearch');
    if (searchInput) {
      searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          doUserSearch();
        }
      });
    }

    const saveRolesBtn = el('saveUserRolesBtn');
    if (saveRolesBtn && selected) {
      saveRolesBtn.addEventListener('click', async () => {
        try {
          const roleIds = Array.from(document.querySelectorAll('#userRolesChecklist input[type="checkbox"][data-role-id]'))
            .filter(cb => cb.checked)
            .map(cb => cb.getAttribute('data-role-id'));

          const data = await api.setUserRoles(selected._id, roleIds);
          show('User roles updated', 'success');
          state.selectedUser = data.user;
          await refreshUsers();
        } catch (e) {
          show(String(e.message || e), 'error');
        }
      });
    }

    const saveSuperBtn = el('saveSuperAdminBtn');
    if (saveSuperBtn && selected && window.auth?.currentUser?.isSuperAdmin) {
      saveSuperBtn.addEventListener('click', async () => {
        try {
          const enabled = Boolean(el('superAdminToggle')?.checked);
          const data = await api.setSuperAdmin(selected._id, enabled);
          show('Superadmin updated', 'success');
          state.selectedUser = data.user;
          await refreshUsers();
        } catch (e) {
          show(String(e.message || e), 'error');
        }
      });
    }
  };

  const renderUserSearchResults = (users) => {
    const container = el('userSearchResults');
    if (!container) return;

    if (!users.length) {
      container.innerHTML = '<p class="empty-message">No users found.</p>';
      return;
    }

    container.innerHTML = `
      <div style="border-top: 1px solid rgba(0,0,0,0.08);">
        ${users.map(u => `
          <div style="display:flex; justify-content:space-between; align-items:center; padding: 10px 0; border-bottom: 1px solid rgba(0,0,0,0.08);">
            <div>
              <div><strong>${escapeHtml(u.username)}</strong> <span style="opacity:0.7;">(${escapeHtml(u.email)})</span></div>
              <div style="opacity:0.8; font-size: 0.9em;">Roles: ${(u.roles || []).map(r => escapeHtml(r.name || '')).filter(Boolean).join(', ') || 'None'}${u.isSuperAdmin ? ' • Superadmin' : ''}</div>
            </div>
            <button type="button" class="btn-primary" data-action="select-user" data-id="${u._id}">Select</button>
          </div>
        `).join('')}
      </div>
    `;

    container.querySelectorAll('[data-action="select-user"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        state.selectedUser = state.users.find(u => u._id === id) || null;
        renderUsers();
      });
    });
  };

  const escapeHtml = (str) => {
    const s = String(str ?? '');
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
    return s.replace(/[&<>"']/g, (m) => map[m]);
  };

  const getSelectedRole = () => {
    if (!state.selectedRoleId) return null;
    return state.roles.find(r => r._id === state.selectedRoleId) || null;
  };

  const readRoleForm = () => {
    const form = el('roleForm');
    if (!form) return null;

    const name = String(form.querySelector('input[name="name"]')?.value || '').trim();
    const description = String(form.querySelector('textarea[name="description"]')?.value || '').trim();
    const permissions = Array.from(form.querySelectorAll('input[type="checkbox"][data-perm]'))
      .filter(cb => cb.checked)
      .map(cb => cb.getAttribute('data-perm'));

    return { name, description, permissions };
  };

  const onSubmitRole = async (e) => {
    e.preventDefault();

    const payload = readRoleForm();
    if (!payload) return;

    try {
      if (state.selectedRoleId) {
        await api.updateRole(state.selectedRoleId, payload);
        show('Role updated', 'success');
      } else {
        await api.createRole(payload);
        show('Role created', 'success');
      }

      state.selectedRoleId = null;
      await refreshRoles();
    } catch (err) {
      show(String(err.message || err), 'error');
    }
  };

  const refreshRoles = async () => {
    const { roles } = await api.getRoles();
    state.roles = roles || [];
    renderRoles();
    renderUsers();
  };

  const refreshTags = async () => {
    const data = await api.getTagsAdmin();
    state.tags = data.tags || [];
    renderTags();
  };

  const refreshResources = async () => {
    const data = await api.getResourcesAdmin();
    state.resources = data.items || [];
    renderResources();
  };

  const refreshPathways = async () => {
    const data = await api.getSiteContent('pathways');
    state.pathways.html = String(data?.content?.html || '');
    state.pathways.updatedAt = data?.content?.updatedAt || null;
    renderPathways();
  };

  const refreshUsers = async (search = '') => {
    const data = await api.searchUsers(search);
    state.users = data.users || [];
    renderUserSearchResults(state.users);
  };

  const doUserSearch = async () => {
    try {
      const q = String(el('userSearch')?.value || '').trim();
      await refreshUsers(q);
    } catch (e) {
      show(String(e.message || e), 'error');
    }
  };

  const init = async () => {
    const rolesSection = el('rolesSection');
    const usersSection = el('usersSection');
    const auditSection = el('auditSection');
    const tagsSection = el('tagsSection');
    const resourcesSection = el('resourcesSection');
    const pathwaysSection = el('pathwaysSection');

    try {
      // Ensure auth status is current
      if (window.auth?.checkAuthStatus) {
        await window.auth.checkAuthStatus();
      }

      const user = window.auth?.currentUser;
      if (!user || !hasPerm(user, PERM_ADMIN_ACCESS)) {
        if (rolesSection) rolesSection.innerHTML = '<p class="empty-message">Admin access required.</p>';
        if (tagsSection) tagsSection.innerHTML = '<p class="empty-message">Admin access required.</p>';
        if (resourcesSection) resourcesSection.innerHTML = '<p class="empty-message">Admin access required.</p>';
        if (pathwaysSection) pathwaysSection.innerHTML = '<p class="empty-message">Admin access required.</p>';
        if (usersSection) usersSection.innerHTML = '<p class="empty-message">Admin access required.</p>';
        if (auditSection) auditSection.innerHTML = '<p class="empty-message">Admin access required.</p>';
        return;
      }

      const perms = await api.getPermissions();
      state.permissionGroups = perms.groups || [];

      await refreshRoles();
      if (tagsSection) {
        await refreshTags();
      }
      if (resourcesSection) {
        await refreshResources();
      }

      if (pathwaysSection) {
        await refreshPathways();
      }
      renderUsers();
      await refreshUsers('');

      // Audit log (only if permitted)
      if (auditSection) {
        if (hasPerm(user, PERM_AUDIT_READ)) {
          await refreshAudit();
        } else {
          renderAudit();
        }
      }
    } catch (e) {
      if (rolesSection) rolesSection.innerHTML = `<p class="empty-message">${escapeHtml(String(e.message || e))}</p>`;
      if (tagsSection) tagsSection.innerHTML = `<p class="empty-message">${escapeHtml(String(e.message || e))}</p>`;
      if (resourcesSection) resourcesSection.innerHTML = `<p class="empty-message">${escapeHtml(String(e.message || e))}</p>`;
      if (pathwaysSection) pathwaysSection.innerHTML = `<p class="empty-message">${escapeHtml(String(e.message || e))}</p>`;
      if (usersSection) usersSection.innerHTML = `<p class="empty-message">${escapeHtml(String(e.message || e))}</p>`;
      if (auditSection) auditSection.innerHTML = `<p class="empty-message">${escapeHtml(String(e.message || e))}</p>`;
    }
  };

  document.addEventListener('DOMContentLoaded', init);
})();
