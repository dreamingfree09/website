/**
 * public/js/forum-enhancements.js
 *
 * Forum UI enhancements.
 *
 * Adds client-side controls for filtering, sorting, pagination, and interaction
 * enhancements on top of the core forum page.
 */
class ForumEnhancements {
  constructor() {
    this.currentSort = 'newest';
    this.currentCategory = 'all';
    this.currentPage = 1;
    this.init();
  }

  init() {
    this.setupFilteringAndSorting();
    this.setupPagination();
  }

  setupFilteringAndSorting() {
    // Category filter
    const categoryFilter = document.getElementById('categoryFilter');
    if (categoryFilter) {
      categoryFilter.addEventListener('change', (e) => {
        this.currentCategory = e.target.value;
        this.currentPage = 1;
        this.loadPosts();
      });
    }

    // Sort dropdown
    const sortSelect = document.getElementById('sortBy');
    if (sortSelect) {
      sortSelect.addEventListener('change', (e) => {
        this.currentSort = e.target.value;
        this.currentPage = 1;
        this.loadPosts();
      });
    }
  }

  setupPagination() {
    const paginationContainer = document.getElementById('paginationContainer');
    if (paginationContainer) {
      paginationContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('page-btn')) {
          this.currentPage = parseInt(e.target.dataset.page);
          this.loadPosts();
        }
      });
    }
  }

  async loadPosts() {
    const container = document.getElementById('topicsContainer');
    if (!container) return;

    try {
      // Show loading
      container.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';

      const params = new URLSearchParams({
        category: this.currentCategory,
        sort: this.currentSort,
        page: this.currentPage,
        limit: 10
      });

      const response = await fetch(`/api/posts?${params}`);
      const data = await response.json();

      this.renderPosts(data.posts);
      this.renderPagination(data.totalPages, data.currentPage);
    } catch (error) {
      console.error('Load posts error:', error);
      container.innerHTML = '<div class="error-message">Failed to load posts</div>';
    }
  }

  renderPosts(posts) {
    const container = document.getElementById('topicsContainer');
    if (!posts || posts.length === 0) {
      container.innerHTML = '<div class="empty-state"><p>No posts found</p></div>';
      return;
    }

    container.innerHTML = posts.map(post => this.renderPostItem(post)).join('');
    this.attachPostEventListeners();
  }

  renderPostItem(post) {
    const myId = String(window.auth?.currentUser?._id || window.auth?.user?._id || '');
    const isLiked = myId
      ? (post.likes || []).some((like) => String(like?._id || like) === myId)
      : false;
    const isPinned = post.isPinned;
    const rank = this.getRankInfo(post.author?.reputation || 0);

    return `
      <div class="topic-item ${isPinned ? 'pinned' : ''}" data-post-id="${post._id}">
        ${isPinned ? '<div class="pin-badge">📌 Pinned</div>' : ''}
        <div class="topic-main">
          <div class="topic-header">
            <h4><a href="/forum.html?post=${encodeURIComponent(post._id)}">${this.escapeHtml(post.title)}</a></h4>
            <span class="topic-category">${this.getCategoryName(post.category)}</span>
          </div>
          <div class="topic-meta">
            <img src="${post.author.avatar || '/images/default-avatar.png'}" alt="${post.author.username}" class="user-avatar-small">
            <span>Posted by <a href="/profile.html?user=${encodeURIComponent(post.author.username)}" class="author-link">${post.author.username}</a></span>
            ${rank.show ? `<span class="rank-badge ${rank.className}">${rank.label}</span>` : ''}
            <span>•</span>
            <span>${this.formatDate(post.createdAt)}</span>
            ${post.author.reputation ? `<span class="reputation">⭐ ${post.author.reputation}</span>` : ''}
          </div>
        </div>
        <div class="topic-actions">
          <div class="vote-widget" data-post-id="${post._id}">
            <button class="vote-btn up" type="button" aria-label="Upvote" data-post-id="${post._id}" data-value="1">▲</button>
            <div class="vote-score" data-post-id="${post._id}">${post.voteScore || 0}</div>
            <button class="vote-btn down" type="button" aria-label="Downvote" data-post-id="${post._id}" data-value="-1">▼</button>
          </div>
          <button class="action-btn like-btn ${isLiked ? 'liked' : ''}" data-post-id="${post._id}">
            <span class="icon">${isLiked ? '❤️' : '🤍'}</span>
            <span class="count">${post.likesCount ?? (post.likes?.length || 0)}</span>
          </button>
          <button class="action-btn reply-btn" onclick="window.location.href='/forum.html?post=${encodeURIComponent(post._id)}#replies'">
            <span class="icon">💬</span>
            <span class="count">${post.repliesCount ?? (post.replies?.length || 0)}</span>
          </button>
          <div class="topic-stat">
            <span class="icon">👁️</span>
            <span class="count">${post.views || 0}</span>
          </div>
        </div>
      </div>
    `;
  }

  renderPagination(totalPages, currentPage) {
    const container = document.getElementById('pagination');
    if (!container || totalPages <= 1) {
      if (container) container.innerHTML = '';
      return;
    }

    let pages = '';
    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= currentPage - 2 && i <= currentPage + 2)) {
        pages += `<button class="page-btn ${i === currentPage ? 'active' : ''}" data-page="${i}">${i}</button>`;
      } else if (i === currentPage - 3 || i === currentPage + 3) {
        pages += '<span class="page-ellipsis">...</span>';
      }
    }

    container.innerHTML = `
      <div class="pagination">
        <button class="page-btn" data-page="${currentPage - 1}" ${currentPage === 1 ? 'disabled' : ''}>← Prev</button>
        ${pages}
        <button class="page-btn" data-page="${currentPage + 1}" ${currentPage === totalPages ? 'disabled' : ''}>Next →</button>
      </div>
    `;
  }

  attachPostEventListeners() {
    // Like button listeners
    document.querySelectorAll('.like-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        const postId = btn.dataset.postId;
        await this.toggleLike(postId, btn);
      });
    });

    // Vote button listeners
    document.querySelectorAll('.vote-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        const postId = btn.dataset.postId;
        const value = Number(btn.dataset.value);
        await this.votePost(postId, value);
      });
    });
  }

  getRankInfo(reputation) {
    const rep = Number(reputation) || 0;
    if (rep >= 1000) return { show: true, label: 'Expert', className: 'rank-expert' };
    if (rep >= 200) return { show: true, label: 'Trusted', className: 'rank-trusted' };
    if (rep >= 50) return { show: true, label: 'Contributor', className: 'rank-contributor' };
    return { show: false, label: '', className: '' };
  }

  async votePost(postId, value) {
    if (!auth?.currentUser) {
      if (typeof showMessage === 'function') {
        showMessage('Please sign in to vote', 'error');
      }
      return;
    }

    try {
      const response = await fetch(`/api/posts/${postId}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value })
      });

      const data = await response.json();
      if (!response.ok) {
        if (typeof showMessage === 'function') {
          showMessage(data.error || 'Failed to vote', 'error');
        }
        return;
      }

      const scoreEl = document.querySelector(`.vote-score[data-post-id="${postId}"]`);
      if (scoreEl) {
        scoreEl.textContent = data.voteScore;
      }
    } catch (error) {
      console.error('Vote error:', error);
      if (typeof showMessage === 'function') {
        showMessage('Failed to vote', 'error');
      }
    }
  }

  async toggleLike(postId, btn) {
    if (!auth?.user) {
      if (typeof showMessage === 'function') {
        showMessage('Please sign in to like posts', 'error');
      }
      return;
    }

    try {
      const response = await fetch(`/api/posts/${postId}/like`, {
        method: 'POST'
      });

      if (response.ok) {
        const data = await response.json();
        const icon = btn.querySelector('.icon');
        const count = btn.querySelector('.count');
        
        const isLiked = data.likes.some(like => like._id === auth.user._id || like === auth.user._id);
        btn.classList.toggle('liked', isLiked);
        icon.textContent = isLiked ? '❤️' : '🤍';
        count.textContent = data.likesCount;
      }
    } catch (error) {
      console.error('Like error:', error);
      if (typeof showMessage === 'function') {
        showMessage('Failed to like post', 'error');
      }
    }
  }

  getCategoryName(category) {
    const names = {
      general: 'General Discussion',
      frontend: 'Frontend',
      backend: 'Backend',
      learning: 'Learning',
      showcase: 'Showcase',
      career: 'Career'
    };
    return names[category] || category;
  }

  formatDate(date) {
    const d = new Date(date);
    const now = new Date();
    const diff = now - d;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return d.toLocaleDateString();
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Initialize
let forumEnhancements;
if (window.location.pathname.includes('forum')) {
  document.addEventListener('DOMContentLoaded', () => {
    forumEnhancements = new ForumEnhancements();
  });
}
