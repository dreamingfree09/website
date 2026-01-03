/**
 * public/js/search.js
 *
 * Client-side search UI.
 *
 * Provides quick in-page searching of forum posts and renders results.
 */
class SearchManager {
  constructor() {
    this.searchInput = document.getElementById('searchInput');
    this.searchBtn = document.getElementById('searchBtn');
    this.searchResults = document.getElementById('searchResults');
    this._debounceTimer = null;
    this.init();
  }

  init() {
    if (!this.searchInput) return;

    // Real-time search
    this.searchInput.addEventListener('input', (e) => {
      const query = e.target.value.trim();
      if (query.length >= 2) {
        if (this._debounceTimer) clearTimeout(this._debounceTimer);
        this._debounceTimer = setTimeout(() => this.search(query), 200);
      } else {
        this.clearResults();
      }
    });

    // Search button click
    if (this.searchBtn) {
      this.searchBtn.addEventListener('click', () => {
        const query = this.searchInput.value.trim();
        if (query.length >= 2) {
          this.search(query);
        }
      });
    }

    // Enter key
    this.searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const query = this.searchInput.value.trim();
        if (query.length >= 2) {
          this.search(query);
        }
      }
    });
  }

  async search(query) {
    try {
      // Show loading
      this.showLoading();

      const url = new URL('/api/search', window.location.origin);
      url.searchParams.set('q', query);
      url.searchParams.set('type', 'all');
      url.searchParams.set('limit', '10');

      const response = await fetch(url.toString());
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Search failed');

      this.displayResults(data, query);
    } catch (error) {
      console.error('Search error:', error);
      this.showError();
    }
  }

  displayResults(payload, query) {
    if (!this.searchResults) return;

    this.searchResults.style.display = 'block';

    const posts = Array.isArray(payload?.posts) ? payload.posts : [];
    const resources = Array.isArray(payload?.resources) ? payload.resources : [];
    const total = posts.length + resources.length;
    
    if (total === 0) {
      this.searchResults.innerHTML = `
        <div class="search-empty">
          <p>No results found for "<strong>${this.escapeHtml(query)}</strong>"</p>
        </div>
      `;
      return;
    }

    const resultsHTML = `
      <div class="search-header">
        <p>Found ${total} result${total !== 1 ? 's' : ''} for "<strong>${this.escapeHtml(query)}</strong>"</p>
      </div>
      <div class="search-items">
        ${posts.map(post => this.createPostResultItem(post, query)).join('')}
        ${resources.map(r => this.createResourceResultItem(r, query)).join('')}
      </div>
    `;
    
    this.searchResults.innerHTML = resultsHTML;
  }

  createPostResultItem(post, query) {
    const excerpt = this.getExcerpt(String(post.content || ''), query);
    const date = new Date(post.createdAt).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });

    const postId = String(post._id || '');
    const onClick = postId
      ? `window.SearchManagerOpenPost && window.SearchManagerOpenPost(${JSON.stringify(postId)})`
      : '';

    return `
      <div class="search-result-item" ${onClick ? `role="button" tabindex="0" onclick='${onClick}'` : ''}>
        <div class="result-header">
          <h4>${this.highlightQuery(post.title, query)}</h4>
          <span class="result-category">Post • ${this.escapeHtml(String(post.category || ''))}</span>
        </div>
        <p class="result-excerpt">${this.highlightQuery(excerpt, query)}</p>
        <div class="result-meta">
          <span>By ${post.author?.username || 'Anonymous'}</span>
          <span>•</span>
          <span>${date}</span>
          <span>•</span>
          <span>${post.repliesCount || 0} replies</span>
        </div>
      </div>
    `;
  }

  createResourceResultItem(resource, query) {
    const title = String(resource?.title || 'Resource');
    const description = String(resource?.description || '');
    const kind = String(resource?.kind || '');
    const level = String(resource?.level || '');
    const url = String(resource?.url || resource?.fileUrl || '').trim();

    const date = resource?.createdAt
      ? new Date(resource.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      : '';

    const linkHtml = url
      ? `<a href="${this.escapeHtml(url)}" target="_blank" rel="noopener noreferrer">Open</a>`
      : '';

    const excerpt = description ? this.getExcerpt(description, query, 140) : '';

    return `
      <div class="search-result-item">
        <div class="result-header">
          <h4>${this.highlightQuery(title, query)}</h4>
          <span class="result-category">Resource • ${this.escapeHtml(kind)}${level ? ` • ${this.escapeHtml(level)}` : ''}</span>
        </div>
        ${excerpt ? `<p class="result-excerpt">${this.highlightQuery(excerpt, query)}</p>` : ''}
        <div class="result-meta">
          ${date ? `<span>${this.escapeHtml(date)}</span><span>•</span>` : ''}
          ${linkHtml}
        </div>
      </div>
    `;
  }

  getExcerpt(content, query, length = 150) {
    const lowerContent = content.toLowerCase();
    const lowerQuery = query.toLowerCase();
    const index = lowerContent.indexOf(lowerQuery);
    
    if (index !== -1) {
      // Show context around the match
      const start = Math.max(0, index - 50);
      const end = Math.min(content.length, index + length);
      let excerpt = content.substring(start, end);
      
      if (start > 0) excerpt = '...' + excerpt;
      if (end < content.length) excerpt = excerpt + '...';
      
      return excerpt;
    }
    
    // Just show beginning
    return content.substring(0, length) + (content.length > length ? '...' : '');
  }

  highlightQuery(text, query) {
    const regex = new RegExp(`(${this.escapeRegex(query)})`, 'gi');
    return this.escapeHtml(text).replace(regex, '<mark>$1</mark>');
  }

  showLoading() {
    if (this.searchResults) {
      this.searchResults.style.display = 'block';
      this.searchResults.innerHTML = '<div class="search-loading"><div class="spinner"></div></div>';
    }
  }

  clearResults() {
    if (this.searchResults) {
      this.searchResults.style.display = 'none';
      this.searchResults.innerHTML = '';
    }
  }

  showError() {
    if (this.searchResults) {
      this.searchResults.style.display = 'block';
      this.searchResults.innerHTML = `
        <div class="search-error">
          <p>Failed to load search results. Please try again.</p>
        </div>
      `;
    }
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}

// Close search results when clicking outside
document.addEventListener('click', (e) => {
  const searchResults = document.getElementById('searchResults');
  const searchInput = document.getElementById('searchInput');
  
  if (searchResults && searchInput) {
    if (!searchResults.contains(e.target) && !searchInput.contains(e.target)) {
      searchResults.style.display = 'none';
    }
  }
});

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  new SearchManager();
});

// Allow the forum page to open a post in-place when possible.
window.SearchManagerOpenPost = (postId) => {
  try {
    const id = String(postId || '').trim();
    if (!id) return;
    if (window.forum && typeof window.forum.selectPost === 'function') {
      window.forum.selectPost(id);
      return;
    }
    window.location.href = `/forum.html?post=${encodeURIComponent(id)}`;
  } catch {
    // ignore
  }
};
