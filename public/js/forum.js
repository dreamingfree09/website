/**
 * public/js/forum.js
 *
 * Forum UI controller.
 *
 * Responsibilities:
 * - Fetch, render, filter, sort, and paginate posts
 * - Create posts/replies via the API
 * - Manage local drafts (localStorage) for a better authoring experience
 */
class Forum {
  constructor() {
    this.posts = [];
    this.currentCategory = 'all';
    this.isLoading = false;
    this.selectedPostId = null;

    this._draftTimers = new Map();
  }

  draftKey(type, postId, extra = '') {
    const base = String(type || '').trim();
    const pid = String(postId || '').trim();
    const suffix = String(extra || '').trim();
    return `forum:draft:${base}:${pid}${suffix ? `:${suffix}` : ''}`;
  }

  loadDraft(key) {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  saveDraft(key, value) {
    try {
      localStorage.setItem(key, String(value ?? ''));
    } catch {
      // ignore
    }
  }

  clearDraft(key) {
    try {
      localStorage.removeItem(key);
    } catch {
      // ignore
    }
  }

  debounceDraft(key, fn, ms = 250) {
    const existing = this._draftTimers.get(key);
    if (existing) clearTimeout(existing);
    const t = setTimeout(() => {
      this._draftTimers.delete(key);
      fn();
    }, ms);
    this._draftTimers.set(key, t);
  }

  async loadPosts(category = 'all') {
    this.isLoading = true;
    this.showLoading();
    
    try {
      const url = category === 'all' 
        ? '/api/posts' 
        : `/api/posts?category=${category}`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (response.ok) {
        this.posts = data.posts;
        this.isLoading = false;
        this.renderPosts();

        // If a post is specified in the URL, auto-select it.
        const postFromUrl = this.getPostIdFromUrl();
        if (postFromUrl) {
          this.selectPost(postFromUrl, { updateUrl: false });
        } else if (this.selectedPostId) {
          // Re-render detail for current selection after list refresh.
          this.selectPost(this.selectedPostId, { updateUrl: false });
        } else {
          // Desktop-first UX: preselect the first post so the detail pane is populated.
          // Only do this when there isn't an explicit selection already.
          const isDesktop = window.matchMedia && window.matchMedia('(min-width: 1024px)').matches;
          if (isDesktop && Array.isArray(this.posts) && this.posts.length > 0) {
            this.selectPost(this.posts[0]._id);
          }
        }
      } else {
        throw new Error(data.error || 'Failed to load posts');
      }
    } catch (error) {
      console.error('Error loading posts:', error);
      this.isLoading = false;
      this.showError('Failed to load posts. Please try again.');
    }
  }

  showLoading() {
    const container = document.getElementById('topicsContainer');
    if (!container) return;
    
    container.innerHTML = `
      <div class="loading-skeleton">
        <div class="skeleton-item"></div>
        <div class="skeleton-item"></div>
        <div class="skeleton-item"></div>
        <div class="skeleton-item"></div>
      </div>
    `;
  }

  showError(message) {
    const container = document.getElementById('topicsContainer');
    if (!container) return;
    
    container.innerHTML = `
      <div class="error-state">
        <div class="error-icon">⚠️</div>
        <h3>Oops! Something went wrong</h3>
        <p>${message}</p>
        <button class="retry-btn" onclick="forum.loadPosts()">Try Again</button>
      </div>
    `;
  }

  async createPost(title, content, category, tags = []) {
    try {
      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content, category, tags })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create post');
      }

      return { success: true, post: data.post };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async updatePost(postId, title, content) {
    try {
      const response = await fetch(`/api/posts/${postId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content })
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update post');
      }

      return { success: true, post: data.post };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async deletePost(postId) {
    try {
      const response = await fetch(`/api/posts/${postId}`, {
        method: 'DELETE'
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete post');
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async restorePost(postId) {
    try {
      const response = await fetch(`/api/posts/${postId}/restore`, {
        method: 'POST'
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || 'Failed to restore post');
      }

      return { success: true, post: data.post };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async updateReply(postId, replyId, content) {
    try {
      const response = await fetch(`/api/posts/${postId}/replies/${replyId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content })
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update reply');
      }

      return { success: true, post: data.post };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async deleteReply(postId, replyId) {
    try {
      const response = await fetch(`/api/posts/${postId}/replies/${replyId}`, {
        method: 'DELETE'
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete reply');
      }

      return { success: true, post: data.post };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async restoreReply(postId, replyId) {
    try {
      const response = await fetch(`/api/posts/${postId}/replies/${replyId}/restore`, {
        method: 'POST'
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || 'Failed to restore reply');
      }

      return { success: true, post: data.post };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async addReply(postId, content, parentReplyId = null) {
    try {
      const response = await fetch(`/api/posts/${postId}/replies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parentReplyId ? { content, parentReplyId } : { content })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to add reply');
      }

      return { success: true, post: data.post };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  renderPosts() {
    const container = document.getElementById('topicsContainer');
    const emptyState = document.getElementById('emptyState');
    
    if (!container) return;

    if (this.posts.length === 0) {
      container.style.display = 'none';
      if (emptyState) emptyState.style.display = 'flex';
      return;
    }

    if (emptyState) emptyState.style.display = 'none';
    container.style.display = 'block';

    const categoryMap = {
      'general': 'General Discussion',
      'frontend': 'Frontend Development',
      'backend': 'Backend Development',
      'learning': 'Learning & Resources',
      'showcase': 'Project Showcase',
      'career': 'Career & Jobs',
      'cybersecurity': 'Cybersecurity',
      'devops': 'DevOps',
      'cloud': 'Cloud & Infrastructure',
      'data': 'Data & Analytics',
      'mobile': 'Mobile Development',
      'ai': 'AI & Machine Learning'
    };

    container.innerHTML = `
      <div class="topics-list">
        ${this.posts.map(post => `
          <div class="topic-item ${this.selectedPostId === post._id ? 'is-active' : ''}" data-post-id="${post._id}">
            <div class="topic-content">
              <h4>${this.escapeHtml(post.title)}</h4>
              <p class="topic-meta">Posted by <strong class="author-name" data-rep="${post.author?.reputation || 0}">${post.author?.username || 'Unknown'}</strong> ${this.renderRankBadge(post.author?.reputation || 0)} in ${categoryMap[post.category]} • ${this.formatDate(post.createdAt)}</p>
            </div>
            <div class="topic-stats">
              <span>${post.voteScore || 0} votes</span>
              <span>${post.replies?.length || 0} replies</span>
              <span style="margin-left: 10px;">${post.views || 0} views</span>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  getPostIdFromUrl() {
    try {
      const url = new URL(window.location.href);
      return url.searchParams.get('post');
    } catch {
      return null;
    }
  }

  updateUrlForPost(postId) {
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('post', postId);
      window.history.replaceState({}, '', url.toString());
    } catch {
      // no-op
    }
  }

  setDetailLoading() {
    const detail = document.getElementById('postDetail');
    if (!detail) return;
    detail.dataset.state = 'loading';
    detail.innerHTML = `
      <div class="post-detail-header">
        <div class="post-detail-title">Loading…</div>
        <div class="post-detail-meta">Fetching discussion</div>
      </div>
      <div class="post-detail-body">
        <div class="loading-skeleton">
          <div class="skeleton-item"></div>
          <div class="skeleton-item"></div>
          <div class="skeleton-item"></div>
        </div>
      </div>
    `;
  }

  setDetailError(message) {
    const detail = document.getElementById('postDetail');
    if (!detail) return;
    detail.dataset.state = 'error';
    detail.innerHTML = `
      <div class="post-detail-header">
        <div class="post-detail-title">Unable to load post</div>
        <div class="post-detail-meta">${this.escapeHtml(message)}</div>
      </div>
      <div class="post-detail-body">
        <button class="retry-btn" type="button" id="retryLoadPostBtn">Try Again</button>
      </div>
    `;
  }

  getCategoryLabel(category) {
    const categoryMap = {
      'general': 'General Discussion',
      'frontend': 'Frontend Development',
      'backend': 'Backend Development',
      'learning': 'Learning & Resources',
      'showcase': 'Project Showcase',
      'career': 'Career & Jobs',
      'cybersecurity': 'Cybersecurity',
      'devops': 'DevOps',
      'cloud': 'Cloud & Infrastructure',
      'data': 'Data & Analytics',
      'mobile': 'Mobile Development',
      'ai': 'AI & Machine Learning'
    };
    return categoryMap[category] || category;
  }

  renderMarkdownSafe(markdown) {
    const text = String(markdown ?? '');
    if (window.MarkdownEditor && typeof window.MarkdownEditor.parse === 'function') {
      return window.MarkdownEditor.parse(text);
    }
    // Fallback: escape HTML and preserve line breaks.
    return this.escapeHtml(text).replace(/\n/g, '<br>');
  }

  renderPostDetail(post) {
    const detail = document.getElementById('postDetail');
    if (!detail) return;

    detail.dataset.state = 'ready';

    const authorName = post.author?.username || 'Unknown';
    const authorRep = post.author?.reputation || 0;
    const myId = window.auth?.currentUser?._id ? String(window.auth.currentUser._id) : '';
    const authorId = post.author?._id ? String(post.author._id) : '';
    const isOwner = !!myId && !!authorId && myId === authorId;
    const createdAt = post.createdAt ? this.formatDate(post.createdAt) : '';
    const replies = Array.isArray(post.replies) ? post.replies : [];
    const replyTree = this.buildReplyTree(replies);

    detail.innerHTML = `
      <div class="post-detail-header">
        <h4 class="post-detail-title">${this.escapeHtml(post.title)}</h4>
        <div class="post-detail-meta">
          <span><strong class="author-name" data-rep="${authorRep}">${this.escapeHtml(authorName)}</strong> ${this.renderRankBadge(authorRep)}</span>
          <span> • ${this.escapeHtml(this.getCategoryLabel(post.category))}</span>
          ${createdAt ? `<span> • ${this.escapeHtml(createdAt)}</span>` : ''}
        </div>
        <div class="post-owner-actions" id="postUtilityActions" data-post-id="${this.escapeHtml(String(post._id))}">
          <button type="button" class="btn-secondary" id="copyPostLinkBtn">Copy link</button>
          ${isOwner ? `
            <button type="button" class="btn-secondary" id="editPostBtn">Edit</button>
            <button type="button" class="btn-secondary" id="deletePostBtn">Delete</button>
          ` : ''}
        </div>
      </div>

      <div class="post-detail-body">
        <div class="post-detail-content" id="postDetailContent">${this.renderMarkdownSafe(post.content)}</div>

        ${isOwner ? `
          <form class="post-edit-form" id="postEditForm" data-post-id="${this.escapeHtml(String(post._id))}" hidden>
            <input type="text" name="title" maxlength="200" value="${this.escapeHtml(post.title)}" required />
            <textarea name="content" required maxlength="5000">${this.escapeHtml(post.content)}</textarea>
            <div class="form-actions">
              <button type="submit" class="btn-primary">Save</button>
              <button type="button" class="btn-secondary" id="cancelEditPostBtn">Cancel</button>
            </div>
          </form>
        ` : ''}
      </div>

      <div class="post-detail-replies" id="postDetailReplies">
        <h5>Replies (${replies.length})</h5>
        <div id="repliesList">
          ${replies.length === 0 ? '<p class="topic-meta">No replies yet.</p>' : this.renderReplyTree(replyTree)}
        </div>

        <div class="reply-form" id="replyFormArea">
          ${(!window.auth || !window.auth.currentUser) ? `
            <p class="topic-meta">Sign in to reply.</p>
            <button type="button" class="cta-btn" id="openSignInForReply">Sign In</button>
          ` : `
            <form id="replyForm">
              <textarea name="content" placeholder="Write a reply… (Markdown supported)" required maxlength="5000"></textarea>
              <div class="form-actions">
                <button type="submit" class="btn-primary">Reply</button>
              </div>
            </form>
          `}
        </div>
      </div>
    `;

    // Autosave + restore draft for root reply box (per-post)
    const replyTextarea = detail.querySelector('#replyForm textarea[name="content"]');
    if (replyTextarea) {
      // Inline length feedback
      if (typeof addCharacterCounter === 'function' && !replyTextarea.parentElement?.querySelector('.char-counter')) {
        addCharacterCounter(replyTextarea, 5000);
      }
      const key = this.draftKey('reply', post._id, 'root');
      const saved = this.loadDraft(key);
      if (saved && !replyTextarea.value) {
        replyTextarea.value = saved;
        if (typeof showMessage === 'function') showMessage('Draft restored.', 'info');
      }
      replyTextarea.addEventListener('input', () => {
        this.debounceDraft(key, () => this.saveDraft(key, replyTextarea.value));
      });
    }
  }

  async selectPost(postId, options = {}) {
    const { updateUrl = true } = options;
    if (!postId) return;

    this.selectedPostId = postId;
    this.renderPosts();

    if (updateUrl) {
      this.updateUrlForPost(postId);
    }

    const cached = this.posts.find(p => p._id === postId);
    if (cached) {
      this.renderPostDetail(cached);
      return;
    }

    this.setDetailLoading();
    try {
      const res = await fetch(`/api/posts/${postId}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to load post');
      }
      this.renderPostDetail(data.post);
    } catch (err) {
      console.error('Error loading post detail:', err);
      this.setDetailError(err.message || 'Failed to load post');
    }
  }

  renderRankBadge(reputation) {
    const rep = Number(reputation) || 0;
    if (rep >= 1000) return '<span class="rank-badge rank-expert">Expert</span>';
    if (rep >= 200) return '<span class="rank-badge rank-trusted">Trusted</span>';
    if (rep >= 50) return '<span class="rank-badge rank-contributor">Contributor</span>';
    return '';
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 7) {
      return date.toLocaleDateString();
    }
    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    return 'Just now';
  }

  buildReplyTree(replies) {
    const byId = new Map();
    const nodes = [];

    for (const reply of replies) {
      if (!reply || !reply._id) continue;
      byId.set(String(reply._id), { reply, children: [] });
    }

    for (const reply of replies) {
      if (!reply || !reply._id) continue;
      const node = byId.get(String(reply._id));
      const parentId = reply.parentReplyId ? String(reply.parentReplyId) : null;
      if (parentId && byId.has(parentId)) {
        byId.get(parentId).children.push(node);
      } else {
        nodes.push(node);
      }
    }

    const sortNodes = (arr) => {
      arr.sort((a, b) => {
        const aTime = new Date(a.reply?.createdAt || 0).getTime();
        const bTime = new Date(b.reply?.createdAt || 0).getTime();
        return aTime - bTime;
      });
      for (const n of arr) sortNodes(n.children);
    };
    sortNodes(nodes);

    return nodes;
  }

  renderReplyTree(nodes) {
    const renderNode = (node) => {
      const r = node.reply;
      const replyAuthor = r.author?.username || 'Unknown';
      const replyWhen = r.createdAt ? this.formatDate(r.createdAt) : '';
      const depth = Number(r.depth) || 1;
      const canReplyDeeper = depth < 5;

      const myId = window.auth?.currentUser?._id ? String(window.auth.currentUser._id) : '';
      const replyAuthorId = r.author?._id ? String(r.author._id) : String(r.author || '');
      const isOwner = !!myId && !!replyAuthorId && myId === replyAuthorId;
      const isDeleted = !!r.deletedAt;
      const edited = !!r.editedAt && !isDeleted;

      return `
        <div class="reply-item" data-reply-id="${this.escapeHtml(String(r._id))}" data-depth="${depth}">
          <div class="reply-meta">
            <strong class="author-name" data-rep="${r.author?.reputation || 0}">${this.escapeHtml(replyAuthor)}</strong>
            ${replyWhen ? ` • ${this.escapeHtml(replyWhen)}` : ''}
            ${edited ? ' • <span class="reply-edited">edited</span>' : ''}
            ${isDeleted ? ' • <span class="reply-deleted">deleted</span>' : ''}
          </div>
          <div class="reply-content">${isDeleted ? '<em>[deleted]</em>' : this.renderMarkdownSafe(r.content)}</div>
          <div class="reply-actions">
            <button type="button" class="reply-action-btn reply-action-reply" data-reply-id="${this.escapeHtml(String(r._id))}" ${canReplyDeeper ? '' : 'disabled'}>
              Reply
            </button>
            ${isOwner && !isDeleted ? `
              <button type="button" class="reply-action-btn reply-action-edit" data-reply-id="${this.escapeHtml(String(r._id))}">Edit</button>
              <button type="button" class="reply-action-btn reply-action-delete" data-reply-id="${this.escapeHtml(String(r._id))}">Delete</button>
            ` : ''}
            ${canReplyDeeper ? '' : '<span class="reply-depth-note">Max depth reached</span>'}
          </div>
          <div class="inline-reply" data-inline-reply-container="${this.escapeHtml(String(r._id))}"></div>
          ${node.children && node.children.length ? `
            <div class="reply-children">
              ${node.children.map(renderNode).join('')}
            </div>
          ` : ''}
        </div>
      `;
    };

    return nodes.map(renderNode).join('');
  }
}

// Initialize forum on forum page
let forum;
if (window.location.pathname.includes('forum')) {
  forum = new Forum();
  
  // Load posts when page loads
  document.addEventListener('DOMContentLoaded', () => {
    forum.loadPosts();

    // Post selection handler (delegated)
    document.addEventListener('click', (e) => {
      const topicItem = e.target.closest('.topic-item');
      if (topicItem && topicItem.dataset && topicItem.dataset.postId) {
        forum.selectPost(topicItem.dataset.postId);
      }

      const retryBtn = e.target.closest('#retryLoadPostBtn');
      if (retryBtn && forum.selectedPostId) {
        forum.selectPost(forum.selectedPostId, { updateUrl: false });
      }

      const openSignIn = e.target.closest('#openSignInForReply');
      if (openSignIn) {
        const signInModal = document.getElementById('signInModal');
        if (signInModal) signInModal.style.display = 'block';
      }

      const replyToReplyBtn = e.target.closest('.reply-action-reply');
      if (replyToReplyBtn) {
        const parentReplyId = replyToReplyBtn.getAttribute('data-reply-id');
        if (!parentReplyId) return;

        if (!window.auth || !window.auth.currentUser) {
          showMessage('Please sign in to reply', 'error');
          const signInModal = document.getElementById('signInModal');
          if (signInModal) signInModal.style.display = 'block';
          return;
        }

        // parentReplyId is a Mongo ObjectId (hex), safe for attribute selector.
        const host = document.querySelector(`[data-inline-reply-container="${parentReplyId}"]`);
        if (!host) return;

        // Close any other inline reply form.
        document.querySelectorAll('.inline-reply form').forEach(f => f.remove());

        const form = document.createElement('form');
        form.className = 'inline-reply-form';
        form.setAttribute('data-parent-reply-id', parentReplyId);
        form.innerHTML = `
          <textarea name="content" placeholder="Reply to this… (Markdown supported)" required maxlength="5000"></textarea>
          <div class="form-actions">
            <button type="submit" class="btn-primary">Reply</button>
            <button type="button" class="btn-secondary inline-reply-cancel">Cancel</button>
          </div>
        `;
        host.appendChild(form);

        const textarea = form.querySelector('textarea');
        if (textarea) {
          if (typeof addCharacterCounter === 'function' && !textarea.parentElement?.querySelector('.char-counter')) {
            addCharacterCounter(textarea, 5000);
          }
          // Autosave + restore draft for this inline reply
          const key = forum.draftKey('reply', forum.selectedPostId || 'unknown', parentReplyId);
          const saved = forum.loadDraft(key);
          if (saved && !textarea.value) {
            textarea.value = saved;
            if (typeof showMessage === 'function') showMessage('Draft restored.', 'info');
          }
          textarea.addEventListener('input', () => {
            forum.debounceDraft(key, () => forum.saveDraft(key, textarea.value));
          });
          textarea.focus();
        }
      }

      const cancelInline = e.target.closest('.inline-reply-cancel');
      if (cancelInline) {
        const form = cancelInline.closest('form');
        if (form) form.remove();
      }

      const copyPostLinkBtn = e.target.closest('#copyPostLinkBtn');
      if (copyPostLinkBtn) {
        const host = document.getElementById('postUtilityActions');
        const postId = host ? host.getAttribute('data-post-id') : null;
        if (!postId) return;
        const url = `${window.location.origin}/forum.html?post=${encodeURIComponent(postId)}`;
        (async () => {
          try {
            if (navigator.clipboard?.writeText) {
              await navigator.clipboard.writeText(url);
              showMessage('Link copied.', 'success');
              return;
            }
          } catch {
            // fall back below
          }

          const tmp = document.createElement('input');
          tmp.value = url;
          document.body.appendChild(tmp);
          tmp.select();
          document.execCommand('copy');
          tmp.remove();
          showMessage('Link copied.', 'success');
        })();
      }

      const editPostBtn = e.target.closest('#editPostBtn');
      if (editPostBtn) {
        const form = document.getElementById('postEditForm');
        const content = document.getElementById('postDetailContent');
        if (form && content) {
          content.hidden = true;
          form.hidden = false;
          const textarea = form.querySelector('textarea[name="content"]');
          if (textarea) textarea.focus();
        }
      }

      const cancelEdit = e.target.closest('#cancelEditPostBtn');
      if (cancelEdit) {
        const form = document.getElementById('postEditForm');
        const content = document.getElementById('postDetailContent');
        if (form && content) {
          form.hidden = true;
          content.hidden = false;
        }
      }

      const deletePostBtn = e.target.closest('#deletePostBtn');
      if (deletePostBtn) {
        const host = document.getElementById('postUtilityActions');
        const postId = host ? host.getAttribute('data-post-id') : null;
        if (!postId) return;

        if (!confirm('Delete this post? You can undo for 10 minutes.')) return;

        (async () => {
          const result = await forum.deletePost(postId);
          if (result.success) {
            showMessage('Post deleted.', 'success', {
              actionText: 'Undo',
              onAction: async () => {
                const restored = await forum.restorePost(postId);
                if (restored.success) {
                  showMessage('Post restored.', 'success');
                  await forum.loadPosts(forum.currentCategory);
                  await forum.selectPost(postId, { updateUrl: false });
                } else {
                  showMessage(restored.error || 'Failed to restore post', 'error');
                }
              }
            });
            forum.selectedPostId = null;
            await forum.loadPosts(forum.currentCategory);
            const detail = document.getElementById('postDetail');
            if (detail) {
              detail.dataset.state = 'empty';
              detail.innerHTML = `
                <div class="post-detail-empty">
                  <h4>Select a discussion</h4>
                  <p>Click a post on the left to read and reply.</p>
                </div>
              `;
            }
          } else {
            showMessage(result.error || 'Failed to delete post', 'error');
          }
        })();
      }

      const editReplyBtn = e.target.closest('.reply-action-edit');
      if (editReplyBtn) {
        const replyId = editReplyBtn.getAttribute('data-reply-id');
        if (!replyId || !forum.selectedPostId) return;

        const host = document.querySelector(`.reply-item[data-reply-id="${replyId}"]`);
        if (!host) return;

        const existing = host.querySelector('form.reply-edit-form');
        if (existing) return;

        const contentEl = host.querySelector('.reply-content');
        const raw = contentEl ? contentEl.textContent : '';

        const form = document.createElement('form');
        form.className = 'reply-edit-form';
        form.setAttribute('data-reply-id', replyId);
        form.innerHTML = `
          <textarea name="content" required maxlength="5000"></textarea>
          <div class="form-actions">
            <button type="submit" class="btn-primary">Save</button>
            <button type="button" class="btn-secondary reply-edit-cancel">Cancel</button>
          </div>
        `;

        const textarea = form.querySelector('textarea');
        if (textarea) textarea.value = raw;

        if (contentEl) {
          contentEl.after(form);
          contentEl.hidden = true;
        } else {
          host.appendChild(form);
        }

        if (textarea) textarea.focus();
      }

      const cancelReplyEdit = e.target.closest('.reply-edit-cancel');
      if (cancelReplyEdit) {
        const form = cancelReplyEdit.closest('form.reply-edit-form');
        if (!form) return;
        const host = form.closest('.reply-item');
        const contentEl = host ? host.querySelector('.reply-content') : null;
        if (contentEl) contentEl.hidden = false;
        form.remove();
      }

      const deleteReplyBtn = e.target.closest('.reply-action-delete');
      if (deleteReplyBtn) {
        const replyId = deleteReplyBtn.getAttribute('data-reply-id');
        if (!replyId || !forum.selectedPostId) return;
        if (!confirm('Delete this reply? You can undo for 10 minutes.')) return;

        (async () => {
          const result = await forum.deleteReply(forum.selectedPostId, replyId);
          if (result.success) {
            showMessage('Reply deleted.', 'success', {
              actionText: 'Undo',
              onAction: async () => {
                const restored = await forum.restoreReply(forum.selectedPostId, replyId);
                if (restored.success) {
                  showMessage('Reply restored.', 'success');
                  await forum.loadPosts(forum.currentCategory);
                  await forum.selectPost(forum.selectedPostId, { updateUrl: false });
                } else {
                  showMessage(restored.error || 'Failed to restore reply', 'error');
                }
              }
            });
            await forum.loadPosts(forum.currentCategory);
            await forum.selectPost(forum.selectedPostId, { updateUrl: false });
          } else {
            showMessage(result.error || 'Failed to delete reply', 'error');
          }
        })();
      }
    });

    // Reply submission handler (delegated because the detail panel is dynamic)
    document.addEventListener('submit', async (e) => {
      const replyForm = e.target.closest('#replyForm');
      const inlineReplyForm = e.target.closest('.inline-reply-form');
      const replyEditForm = e.target.closest('form.reply-edit-form');

      if (replyEditForm) {
        e.preventDefault();
        if (!forum.selectedPostId) return;
        const replyId = replyEditForm.getAttribute('data-reply-id');
        const textarea = replyEditForm.querySelector('textarea[name="content"]');
        const content = textarea ? textarea.value.trim() : '';
        if (!replyId || !content) {
          showMessage('Reply cannot be empty', 'error');
          return;
        }

        const submitBtn = replyEditForm.querySelector('button[type="submit"]');
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.textContent = 'Saving…';
        }

        const result = await forum.updateReply(forum.selectedPostId, replyId, content);

        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Save';
        }

        if (result.success) {
          showMessage('Reply updated.', 'success');
          await forum.loadPosts(forum.currentCategory);
          await forum.selectPost(forum.selectedPostId, { updateUrl: false });
        } else {
          showMessage(result.error || 'Failed to update reply', 'error');
        }
        return;
      }

      if (inlineReplyForm) {
        e.preventDefault();
        if (!forum.selectedPostId) {
          showMessage('Select a post to reply to', 'error');
          return;
        }

        const parentReplyId = inlineReplyForm.getAttribute('data-parent-reply-id');
        const textarea = inlineReplyForm.querySelector('textarea[name="content"]');
        const content = textarea ? textarea.value.trim() : '';

        if (!content) {
          showMessage('Reply cannot be empty', 'error');
          return;
        }

        const submitBtn = inlineReplyForm.querySelector('button[type="submit"]');
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.textContent = 'Replying…';
        }

        const result = await forum.addReply(forum.selectedPostId, content, parentReplyId);

        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Reply';
        }

        if (result.success) {
          if (parentReplyId) {
            forum.clearDraft(forum.draftKey('reply', forum.selectedPostId, parentReplyId));
          }
          showMessage('Reply added!', 'success');
          inlineReplyForm.remove();
          await forum.loadPosts(forum.currentCategory);
          await forum.selectPost(forum.selectedPostId, { updateUrl: false });
        } else {
          showMessage(result.error, 'error');
        }
        return;
      }

      const postEditForm = e.target.closest('#postEditForm');
      if (postEditForm) {
        e.preventDefault();
        const postId = postEditForm.getAttribute('data-post-id');
        if (!postId) {
          showMessage('Invalid post.', 'error');
          return;
        }

        const titleInput = postEditForm.querySelector('input[name="title"]');
        const contentInput = postEditForm.querySelector('textarea[name="content"]');
        const title = titleInput ? titleInput.value.trim() : '';
        const content = contentInput ? contentInput.value.trim() : '';

        if (!title || !content) {
          showMessage('Title and content are required.', 'error');
          return;
        }

        const submitBtn = postEditForm.querySelector('button[type="submit"]');
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.textContent = 'Saving…';
        }

        const result = await forum.updatePost(postId, title, content);

        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Save';
        }

        if (result.success) {
          showMessage('Post updated.', 'success');
          const form = document.getElementById('postEditForm');
          const contentEl = document.getElementById('postDetailContent');
          if (form && contentEl) {
            form.hidden = true;
            contentEl.hidden = false;
          }
          await forum.loadPosts(forum.currentCategory);
          await forum.selectPost(postId, { updateUrl: false });
        } else {
          showMessage(result.error || 'Failed to update post', 'error');
        }

        return;
      }

      if (!replyForm) return;
      e.preventDefault();

      if (!forum.selectedPostId) {
        showMessage('Select a post to reply to', 'error');
        return;
      }

      const textarea = replyForm.querySelector('textarea[name="content"]');
      const content = textarea ? textarea.value.trim() : '';
      if (!content) {
        showMessage('Reply cannot be empty', 'error');
        return;
      }

      const submitBtn = replyForm.querySelector('button[type="submit"]');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Replying…';
      }

      const result = await forum.addReply(forum.selectedPostId, content);

      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Reply';
      }

      if (result.success) {
        if (textarea) textarea.value = '';
        forum.clearDraft(forum.draftKey('reply', forum.selectedPostId, 'root'));
        showMessage('Reply added!', 'success');
        // Refresh list + keep selection
        await forum.loadPosts(forum.currentCategory);
        await forum.selectPost(forum.selectedPostId, { updateUrl: false });
      } else {
        showMessage(result.error, 'error');
      }
    });

    // Create post button handler (delegated so it still works if the DOM is re-rendered)
    if (!window.__forumCreatePostClickBound) {
      window.__forumCreatePostClickBound = true;
      document.addEventListener('click', async (e) => {
        const createPostBtn = e.target.closest('#createPostBtn');
        if (!createPostBtn) return;

        const createPostModal = document.getElementById('createPostModal');
        // Don't rely solely on auth.currentUser; it can be stale if the page loaded
        // before /api/auth/me finished or if the auth UI was updated.
        if (!auth || !auth.currentUser) {
          try {
            const meRes = await fetch('/api/auth/me');
            if (meRes.ok) {
              const meData = await meRes.json();
              auth.currentUser = meData.user;
              if (typeof auth.updateUI === 'function') {
                auth.updateUI();
              }
            }
          } catch (err) {
            // ignore; we'll fall back to sign-in prompt below
          }
        }

        if (!auth || !auth.currentUser) {
          showMessage('Please sign in to create a post', 'error');
          const signInModal = document.getElementById('signInModal');
          if (signInModal) signInModal.style.display = 'block';
          return;
        }

        if (createPostModal) createPostModal.style.display = 'block';
      });
    }

    // Create post form handler
    const createPostForm = document.getElementById('createPostForm');
    if (createPostForm) {
      const createPostModal = document.getElementById('createPostModal');
      // Add character counters
      const titleInput = createPostForm.querySelector('input[name="title"]');
      const contentInput = createPostForm.querySelector('textarea[name="content"]');
      const tagsSelect = createPostForm.querySelector('select[name="tags"]');
      
      if (titleInput) {
        addCharacterCounter(titleInput, 200);
      }
      if (contentInput) {
        addCharacterCounter(contentInput, 5000);
      }

      const getSelectedTags = () => {
        if (!tagsSelect) return [];
        return Array.from(tagsSelect.selectedOptions)
          .map(o => String(o.value || '').trim())
          .filter(Boolean);
      };

      const applySelectedTags = (slugs) => {
        if (!tagsSelect) return;
        const wanted = new Set(
          (Array.isArray(slugs) ? slugs : [])
            .map(s => String(s || '').trim())
            .filter(Boolean)
        );
        Array.from(tagsSelect.options).forEach(opt => {
          opt.selected = wanted.has(String(opt.value));
        });
      };

      let tagsLoaded = false;
      const loadCuratedTags = async () => {
        if (!tagsSelect || tagsLoaded) return;
        try {
          tagsSelect.innerHTML = '<option value="" disabled>Loading tags…</option>';
          const res = await fetch('/api/tags');
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Failed to load tags');

          const tags = Array.isArray(data.tags) ? data.tags : [];
          tags.sort((a, b) => {
            const ac = String(a.category || '');
            const bc = String(b.category || '');
            if (ac !== bc) return ac.localeCompare(bc);
            return String(a.name || '').localeCompare(String(b.name || ''));
          });

          tagsSelect.innerHTML = tags.length
            ? tags
                .map(t => {
                  const label = t.category ? `${t.name} (${t.category})` : t.name;
                  const slug = String(t.slug || '').trim();
                  return `<option value="${slug}">${label}</option>`;
                })
                .join('')
            : '<option value="" disabled>No tags available</option>';

          tagsLoaded = true;
        } catch {
          tagsSelect.innerHTML = '<option value="" disabled>Failed to load tags</option>';
          tagsLoaded = true;
        }
      };

      createPostForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const title = titleInput.value.trim();
        const content = contentInput.value.trim();
        const category = createPostForm.querySelector('select[name="category"]').value;
        const tags = getSelectedTags();

        // Validation
        if (!title || !content || !category) {
          showMessage('Please fill in all fields', 'error');
          return;
        }

        if (title.length > 200) {
          showMessage('Title must be less than 200 characters', 'error');
          return;
        }

        if (content.length < 10) {
          showMessage('Content must be at least 10 characters', 'error');
          return;
        }

        if (content.length > 5000) {
          showMessage('Content must be less than 5000 characters', 'error');
          return;
        }

        const submitBtn = createPostForm.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Posting...';

        const result = await forum.createPost(title, content, category, tags);
        
        submitBtn.disabled = false;
        submitBtn.textContent = 'Post';

        if (result.success) {
          // Clear create-post drafts
          forum.clearDraft(forum.draftKey('create', 'global', 'title'));
          forum.clearDraft(forum.draftKey('create', 'global', 'content'));
          forum.clearDraft(forum.draftKey('create', 'global', 'category'));
          forum.clearDraft(forum.draftKey('create', 'global', 'tags'));

          createPostModal.style.display = 'none';
          createPostForm.reset();
          // Reset character counters
          const counters = createPostForm.querySelectorAll('.char-counter');
          counters.forEach(counter => {
            counter.textContent = counter.textContent.split('/')[1] ? `0 / ${counter.textContent.split('/')[1].trim()}` : '0';
            counter.classList.remove('warning', 'error');
          });
          showMessage('Post created successfully!', 'success');
          forum.loadPosts(); // Reload posts
        } else {
          showMessage(result.error, 'error');
        }
      });

      // Autosave create-post draft
      const titleKey = forum.draftKey('create', 'global', 'title');
      const contentKey = forum.draftKey('create', 'global', 'content');
      const categoryKey = forum.draftKey('create', 'global', 'category');
      const tagsKey = forum.draftKey('create', 'global', 'tags');

      const restoreCreateDraft = () => {
        const t = forum.loadDraft(titleKey);
        const c = forum.loadDraft(contentKey);
        const cat = forum.loadDraft(categoryKey);
        const savedTags = forum.loadDraft(tagsKey);
        if (titleInput && t) titleInput.value = t;
        if (contentInput && c) contentInput.value = c;
        const sel = createPostForm.querySelector('select[name="category"]');
        if (sel && cat) sel.value = cat;
        if (savedTags) {
          try {
            const slugs = JSON.parse(savedTags);
            applySelectedTags(slugs);
          } catch {
            // ignore
          }
        }
        if ((t || c || cat || savedTags) && typeof showMessage === 'function') {
          showMessage('Draft restored.', 'info');
        }
      };

      // Restore when modal opens
      document.addEventListener('click', (e) => {
        const openBtn = e.target.closest('#createPostBtn, #createFirstPostBtn');
        if (!openBtn) return;
        setTimeout(async () => {
          await loadCuratedTags();
          restoreCreateDraft();
        }, 0);
      });

      if (titleInput) {
        titleInput.addEventListener('input', () => {
          forum.debounceDraft(titleKey, () => forum.saveDraft(titleKey, titleInput.value));
        });
      }
      if (contentInput) {
        contentInput.addEventListener('input', () => {
          forum.debounceDraft(contentKey, () => forum.saveDraft(contentKey, contentInput.value));
        });
      }
      const sel = createPostForm.querySelector('select[name="category"]');
      if (sel) {
        sel.addEventListener('change', () => forum.saveDraft(categoryKey, sel.value));
      }

      if (tagsSelect) {
        tagsSelect.addEventListener('change', () => {
          forum.saveDraft(tagsKey, JSON.stringify(getSelectedTags()));
        });
      }

      // Initial load
      loadCuratedTags().then(() => restoreCreateDraft());
    }
  });

  // Helper: Add character counter to input/textarea
  function addCharacterCounter(input, maxLength) {
    const container = input.parentElement;
    const counter = document.createElement('div');
    counter.className = 'char-counter';
    counter.textContent = `0 / ${maxLength}`;
    container.appendChild(counter);

    input.addEventListener('input', () => {
      const length = input.value.length;
      counter.textContent = `${length} / ${maxLength}`;
      
      counter.classList.remove('warning', 'error');
      if (length > maxLength) {
        counter.classList.add('error');
      } else if (length > maxLength * 0.9) {
        counter.classList.add('warning');
      }
    });
  }

  // Initialize forum enhancements if available
  if (typeof ForumEnhancements !== 'undefined') {
    const forumEnhancements = new ForumEnhancements(forum);
  }
}
