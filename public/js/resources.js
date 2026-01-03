/**
 * public/js/resources.js
 *
 * Resources page UI.
 *
 * Loads curated tags + curated resources from the API and renders a public browse
 * experience. Also supports tag filtering.
 */
(function () {
  const PERM_ADMIN_ACCESS = 'admin:access';
  const PERM_RESOURCES_CREATE = 'resources:create';

  const el = (id) => document.getElementById(id);

  const escapeHtml = (str) => {
    const s = String(str ?? '');
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
    return s.replace(/[&<>"']/g, (m) => map[m]);
  };

  const state = {
    tags: [],
    resources: [],
    isLoading: false,
    page: 1,
    limit: 30,
    hasMore: false,
  };

  const setLoading = (isLoading) => {
    state.isLoading = Boolean(isLoading);

    const refreshBtn = el('refreshResourcesBtn');
    if (refreshBtn) refreshBtn.disabled = state.isLoading;

    const searchBtn = el('resourceSearchBtn');
    if (searchBtn) searchBtn.disabled = state.isLoading;

    const loadMoreBtn = el('loadMoreResourcesBtn');
    if (loadMoreBtn) loadMoreBtn.disabled = state.isLoading;
  };

  const setLoadMoreVisible = (isVisible) => {
    const btn = el('loadMoreResourcesBtn');
    if (!btn) return;
    btn.style.display = isVisible ? 'inline-block' : 'none';
  };

  const getCurrentUser = () => {
    // Prefer the live Auth instance if present, fallback to localStorage.
    const fromAuth = window.auth?.currentUser;
    if (fromAuth) return fromAuth;
    try {
      const stored = localStorage.getItem('currentUser');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  };

  const hasPerm = (user, perm) => {
    const perms = user?.permissions || [];
    return Boolean(user?.isSuperAdmin) || perms.includes(perm);
  };

  const api = {
    async getTags() {
      const res = await fetch('/api/tags');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load tags');
      return data;
    },
    async getResources(params = {}) {
      const url = new URL('/api/resources', window.location.origin);
      if (params.tag) url.searchParams.set('tag', String(params.tag));
      if (params.search) url.searchParams.set('search', String(params.search));
      if (params.page) url.searchParams.set('page', String(params.page));
      if (params.limit) url.searchParams.set('limit', String(params.limit));
      const res = await fetch(url.toString());
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
  };

  const setError = (msg) => {
    const box = el('resourcesError');
    if (!box) return;
    if (!msg) {
      box.style.display = 'none';
      box.textContent = '';
      return;
    }
    box.style.display = 'block';
    box.textContent = msg;
  };

  const renderTags = () => {
    const select = el('tagFilter');
    if (!select) return;

    const current = String(select.value || '');

    const options = ['<option value="">All tags</option>']
      .concat(
        (state.tags || []).map((t) => {
          const label = t.category ? `${t.name} (${t.category})` : t.name;
          return `<option value="${escapeHtml(t.slug)}">${escapeHtml(label)}</option>`;
        })
      )
      .join('');

    select.innerHTML = options;

    // restore selection if possible
    const still = (state.tags || []).some((t) => t.slug === current);
    select.value = still ? current : '';
  };

  const renderStaffTools = () => {
    const tools = el('staffResourceTools');
    if (!tools) return;

    const user = getCurrentUser();
    const canCreate = hasPerm(user, PERM_RESOURCES_CREATE);
    const canAdmin = hasPerm(user, PERM_ADMIN_ACCESS);

    // Only show the tools if the user can create resources.
    tools.style.display = canCreate ? 'block' : 'none';

    // If the user can't access admin, hide the link (still allow quick-create).
    const adminLink = tools.querySelector('a[href="/admin.html"]');
    if (adminLink) adminLink.style.display = canAdmin ? 'inline-block' : 'none';

    const buildTagOptions = () => {
      const options = (state.tags || []).map((t) => {
        const label = t.category ? `${t.name} (${t.category})` : t.name;
        return `<option value="${escapeHtml(t.slug)}">${escapeHtml(label)}</option>`;
      }).join('');

      const linkTags = el('newResourceTags');
      const pdfTags = el('pdfResourceTags');
      if (linkTags) linkTags.innerHTML = options;
      if (pdfTags) pdfTags.innerHTML = options;
    };

    buildTagOptions();

    const getSelectedTags = (selectEl) => {
      if (!selectEl) return [];
      return Array.from(selectEl.selectedOptions).map(o => String(o.value || '').trim()).filter(Boolean);
    };

    const linkForm = el('addResourceLinkForm');
    if (linkForm && !linkForm.dataset.bound) {
      linkForm.dataset.bound = 'true';
      linkForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
          const title = String(el('newResourceTitle')?.value || '').trim();
          const url = String(el('newResourceUrl')?.value || '').trim();
          const description = String(el('newResourceDescription')?.value || '').trim();
          const kind = String(el('newResourceKind')?.value || 'documentation').trim();
          const level = String(el('newResourceLevel')?.value || 'all').trim();
          const tags = getSelectedTags(el('newResourceTags'));

          const platformName = String(el('newResourcePlatformName')?.value || '').trim();
          const platformUrl = String(el('newResourcePlatformUrl')?.value || '').trim();
          const creatorName = String(el('newResourceCreatorName')?.value || '').trim();
          const creatorUrl = String(el('newResourceCreatorUrl')?.value || '').trim();

          if (!title || !url) {
            window.showMessage?.('Title and URL are required', 'error');
            return;
          }

          await api.createResourceLink({
            title,
            url,
            description,
            kind,
            level,
            tags,
            platformName,
            platformUrl,
            creatorName,
            creatorUrl,
          });
          window.showMessage?.('Resource created', 'success');
          linkForm.reset();
          await refresh();
        } catch (err) {
          window.showMessage?.(String(err?.message || err), 'error');
        }
      });
    }

    const pdfForm = el('uploadResourcePdfForm');
    if (pdfForm && !pdfForm.dataset.bound) {
      pdfForm.dataset.bound = 'true';
      pdfForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
          const fileInput = el('pdfResourceFile');
          const file = fileInput?.files?.[0] || null;
          if (!file) {
            window.showMessage?.('Please choose a PDF file to upload', 'error');
            return;
          }

          const title = String(el('pdfResourceTitle')?.value || '').trim();
          const description = String(el('pdfResourceDescription')?.value || '').trim();
          const level = String(el('pdfResourceLevel')?.value || 'all').trim();
          const tags = getSelectedTags(el('pdfResourceTags'));

          const platformName = String(el('pdfResourcePlatformName')?.value || '').trim();
          const platformUrl = String(el('pdfResourcePlatformUrl')?.value || '').trim();
          const creatorName = String(el('pdfResourceCreatorName')?.value || '').trim();
          const creatorUrl = String(el('pdfResourceCreatorUrl')?.value || '').trim();

          const formData = new FormData();
          if (title) formData.set('title', title);
          if (description) formData.set('description', description);
          formData.set('level', level);
          formData.set('tags', JSON.stringify(tags));
          if (platformName) formData.set('platformName', platformName);
          if (platformUrl) formData.set('platformUrl', platformUrl);
          if (creatorName) formData.set('creatorName', creatorName);
          if (creatorUrl) formData.set('creatorUrl', creatorUrl);
          formData.append('file', file);

          await api.uploadResourcePdf(formData);
          window.showMessage?.('PDF uploaded', 'success');
          pdfForm.reset();
          await refresh();
        } catch (err) {
          window.showMessage?.(String(err?.message || err), 'error');
        }
      });
    }
  };

  const renderResourceRows = (resources) => {
    return (resources || [])
      .map((r) => {
        const tagStr = Array.isArray(r.tags) && r.tags.length ? r.tags.join(', ') : '';
        const meta = `${escapeHtml(r.kind)} • ${escapeHtml(r.level)}`;

        const extraBits = [];
        if (r.platformName) {
          extraBits.push(
            r.platformUrl
              ? `Platform: <a href="${escapeHtml(r.platformUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(r.platformName)}</a>`
              : `Platform: ${escapeHtml(r.platformName)}`
          );
        }
        if (r.creatorName) {
          extraBits.push(
            r.creatorUrl
              ? `YouTube: <a href="${escapeHtml(r.creatorUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(r.creatorName)}</a>`
              : `YouTube: ${escapeHtml(r.creatorName)}`
          );
        }

        let linkHtml = '';
        if (r.url) {
          const safeUrl = escapeHtml(r.url);
          linkHtml = `<a href="${safeUrl}" target="_blank" rel="noopener noreferrer">Open link</a>`;
        } else if (r.fileUrl) {
          const safeFile = escapeHtml(r.fileUrl);
          linkHtml = `<a href="${safeFile}" target="_blank" rel="noopener noreferrer">Download PDF</a>`;
        }

        return `
          <div style="padding: 12px 0; border-top: 1px solid var(--border-color);">
            <div style="display:flex; justify-content:space-between; gap: 12px; align-items: baseline; flex-wrap: wrap;">
              <div style="min-width:0;">
                <div><strong>${escapeHtml(r.title)}</strong></div>
                <div style="opacity:0.75; font-size: 0.92em;">${meta}${tagStr ? ` • Tags: ${escapeHtml(tagStr)}` : ''}${extraBits.length ? ` • ${extraBits.join(' • ')}` : ''}</div>
              </div>
              <div style="flex-shrink:0;">${linkHtml}</div>
            </div>
            ${r.description ? `<div style="margin-top: 8px; opacity:0.85;">${escapeHtml(r.description)}</div>` : ''}
          </div>
        `;
      })
      .join('');
  };

  const renderResources = () => {
    const container = el('resourcesList');
    if (!container) return;

    if (!state.resources.length) {
      container.innerHTML = '<p class="empty-message">No resources found.</p>';
      setLoadMoreVisible(false);
      return;
    }

    container.innerHTML = renderResourceRows(state.resources);
    setLoadMoreVisible(state.hasMore);
  };

  const appendResources = (newItems) => {
    const container = el('resourcesList');
    if (!container) return;
    if (!Array.isArray(newItems) || !newItems.length) return;
    container.insertAdjacentHTML('beforeend', renderResourceRows(newItems));
  };

  const fetchPage = async ({ page, append }) => {
    setError('');
    setLoading(true);

    const select = el('tagFilter');
    const tag = select ? String(select.value || '') : '';
    const searchValue = String(el('resourceSearchInput')?.value || '').trim();

    try {
      const data = await api.getResources({
        tag,
        search: searchValue,
        page,
        limit: state.limit,
      });

      const items = Array.isArray(data.items) ? data.items : [];
      state.page = Number(data.page) || page;
      state.hasMore = Boolean(data.hasMore);

      if (append) {
        state.resources = state.resources.concat(items);
        appendResources(items);
        setLoadMoreVisible(state.hasMore);
      } else {
        state.resources = items;
        renderResources();
      }
    } finally {
      setLoading(false);
    }
  };

  const refresh = async () => {
    state.page = 1;
    await fetchPage({ page: 1, append: false });
  };

  const loadMore = async () => {
    if (state.isLoading) return;
    if (!state.hasMore) return;
    await fetchPage({ page: state.page + 1, append: true });
  };

  const init = async () => {
    try {
      // Support linking to resources with a pre-filled query: /resources.html?q=linux
      // Support linking to resources with a pre-filled query: /resources.html?q=linux
      try {
        const url = new URL(window.location.href);
        const q = String(url.searchParams.get('q') || '').trim();
        if (q) {
          const input = el('resourceSearchInput');
          if (input) input.value = q;
        }
      } catch {
        // ignore
      }

      // Performance: fetch tags + first resource page in parallel.
      // This reduces the "Loading…" time noticeably on slower machines/connections.
      setError('');
      setLoading(true);

      const initialSearch = String(el('resourceSearchInput')?.value || '').trim();
      const [tagsData, resourcesData] = await Promise.all([
        api.getTags(),
        api.getResources({ page: 1, limit: state.limit, search: initialSearch }),
      ]);

      state.tags = tagsData.tags || [];
      renderTags();
      renderStaffTools();

      const items = Array.isArray(resourcesData.items) ? resourcesData.items : [];
      state.resources = items;
      state.page = Number(resourcesData.page) || 1;
      state.hasMore = Boolean(resourcesData.hasMore);
      renderResources();
      setLoading(false);

      const select = el('tagFilter');
      if (select) {
        select.addEventListener('change', () => {
          refresh().catch((e) => setError(String(e.message || e)));
        });
      }

      const refreshBtn = el('refreshResourcesBtn');
      if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
          refresh().catch((e) => setError(String(e.message || e)));
        });
      }

      const loadMoreBtn = el('loadMoreResourcesBtn');
      if (loadMoreBtn) {
        loadMoreBtn.addEventListener('click', () => {
          loadMore().catch((e) => setError(String(e.message || e)));
        });
      }

      const searchBtn = el('resourceSearchBtn');
      if (searchBtn) {
        searchBtn.addEventListener('click', () => {
          refresh().catch((e) => setError(String(e.message || e)));
        });
      }

      const searchInput = el('resourceSearchInput');
      if (searchInput) {
        let t = null;
        searchInput.addEventListener('input', () => {
          if (t) clearTimeout(t);
          t = setTimeout(() => {
            if (state.isLoading) return;
            refresh().catch((e) => setError(String(e.message || e)));
          }, 250);
        });
        searchInput.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            if (state.isLoading) return;
            refresh().catch((err) => setError(String(err.message || err)));
          }
        });
      }

      // If the user changes filters/search, we will refresh from the API.

      // Auth state might refresh after page load; re-evaluate staff tools shortly.
      setTimeout(() => {
        try { renderStaffTools(); } catch {}
      }, 600);
    } catch (e) {
      setLoading(false);
      setError(String(e.message || e));
      const container = el('resourcesList');
      if (container) container.innerHTML = '<p class="empty-message">Failed to load resources.</p>';
    }
  };

  document.addEventListener('DOMContentLoaded', init);
})();
