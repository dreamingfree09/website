/*
  public/js/home.js

  Home page dynamic content:
  - Latest discussions (from /api/posts)
  - Featured resources (from /api/resources)

  The Home page is intentionally lightweight: it’s an intro + gateway.
  We keep this file dependency-free and resilient to partial API failures.
*/

(function () {
  const latestContainer = document.getElementById('homeLatestDiscussions');
  const newsContainer = document.getElementById('homeTechNews');
  const resourcesContainer = document.getElementById('homeFeaturedResources');

  if (!latestContainer && !newsContainer && !resourcesContainer) return;

  const formatCompactDate = (iso) => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const safeText = (value) => String(value ?? '').trim();

  const createFeatureCard = ({ icon, title, description, ctaText, href, external }) => {
    const card = document.createElement('div');
    card.className = 'feature-card';

    const iconEl = document.createElement('div');
    iconEl.className = 'feature-icon';
    iconEl.textContent = icon;

    const titleEl = document.createElement('h3');
    titleEl.textContent = title;

    const descEl = document.createElement('p');
    descEl.textContent = description;

    const link = document.createElement('a');
    link.className = 'btn-secondary';
    link.href = href;
    link.textContent = ctaText;

    if (external) {
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
    }

    card.appendChild(iconEl);
    card.appendChild(titleEl);
    card.appendChild(descEl);
    card.appendChild(link);

    return card;
  };

  const setLoading = (container, label) => {
    if (!container) return;
    container.innerHTML = '';

    const placeholders = Array.from({ length: 3 }).map(() =>
      createFeatureCard({
        icon: '…',
        title: 'Loading…',
        description: label,
        ctaText: 'Please wait',
        href: '#',
        external: false,
      })
    );

    for (const card of placeholders) {
      // Disable placeholder CTAs
      const a = card.querySelector('a');
      if (a) {
        a.setAttribute('aria-disabled', 'true');
        a.tabIndex = -1;
        a.addEventListener('click', (e) => e.preventDefault());
      }
      container.appendChild(card);
    }
  };

  const setError = (container, message, href, ctaText) => {
    if (!container) return;
    container.innerHTML = '';
    container.appendChild(
      createFeatureCard({
        icon: '⚠️',
        title: 'Couldn’t load right now',
        description: message,
        ctaText,
        href,
        external: false,
      })
    );
  };

  const fetchJson = async (url, { timeoutMs = 7000 } = {}) => {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const resp = await fetch(url, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: controller.signal,
      });

      if (!resp.ok) {
        throw new Error(`Request failed: ${resp.status}`);
      }

      return await resp.json();
    } finally {
      clearTimeout(t);
    }
  };

  const renderLatestDiscussions = (posts) => {
    if (!latestContainer) return;
    latestContainer.innerHTML = '';

    const top = Array.isArray(posts) ? posts.slice(0, 3) : [];

    if (!top.length) {
      setError(latestContainer, 'No discussions yet. Start the conversation.', '/forum.html', 'Open Forum');
      return;
    }

    for (const p of top) {
      const id = safeText(p && p._id);
      const title = safeText(p && p.title) || 'Untitled post';
      const category = safeText(p && p.category) || 'general';
      const author = safeText(p && p.author && p.author.username) || 'someone';
      const createdAt = formatCompactDate(p && p.createdAt);

      const replies = Array.isArray(p && p.replies) ? p.replies.length : 0;
      const views = Number.isFinite(Number(p && p.views)) ? Number(p.views) : 0;

      const description = `${category} • ${author}${createdAt ? ` • ${createdAt}` : ''} • ${replies} repl${replies === 1 ? 'y' : 'ies'} • ${views} views`;

      const href = id ? `/post/${encodeURIComponent(id)}` : '/forum.html';

      latestContainer.appendChild(
        createFeatureCard({
          icon: '💬',
          title,
          description,
          ctaText: 'Read & reply',
          href,
          external: false,
        })
      );
    }
  };

  const renderFeaturedResources = (items) => {
    if (!resourcesContainer) return;
    resourcesContainer.innerHTML = '';

    const top = Array.isArray(items) ? items.slice(0, 3) : [];

    if (!top.length) {
      setError(resourcesContainer, 'No featured resources yet. Browse the library.', '/resources.html', 'Browse Resources');
      return;
    }

    for (const r of top) {
      const title = safeText(r && r.title) || 'Resource';
      const description = safeText(r && r.description) || 'Open the resource.';

      const hrefRaw = safeText((r && r.url) || (r && r.fileUrl));
      const href = hrefRaw || '/resources.html';
      const external = Boolean(hrefRaw) && (hrefRaw.startsWith('http://') || hrefRaw.startsWith('https://'));

      resourcesContainer.appendChild(
        createFeatureCard({
          icon: '📚',
          title,
          description,
          ctaText: hrefRaw ? 'Open resource' : 'Browse Resources',
          href,
          external,
        })
      );
    }
  };

  const renderTechNews = (items) => {
    if (!newsContainer) return;
    newsContainer.innerHTML = '';

    const top = Array.isArray(items) ? items.slice(0, 12) : [];

    if (!top.length) {
      setError(newsContainer, 'Tech news is temporarily unavailable.', '/', 'Refresh');
      return;
    }

    for (const n of top) {
      const title = safeText(n && n.title) || 'Tech news';
      const source = safeText(n && n.source) || 'News';
      const publishedAt = formatCompactDate(n && n.publishedAt);
      const summary = safeText(n && n.summary) || '';

      const description = `${source}${publishedAt ? ` • ${publishedAt}` : ''}${summary ? ` • ${summary}` : ''}`;
      const hrefRaw = safeText(n && n.url);
      const href = hrefRaw || '/';
      const external = Boolean(hrefRaw) && (hrefRaw.startsWith('http://') || hrefRaw.startsWith('https://'));

      newsContainer.appendChild(
        createFeatureCard({
          icon: '📰',
          title,
          description,
          ctaText: hrefRaw ? 'Open article' : 'Refresh',
          href,
          external,
        })
      );
    }

    setupTechNewsCarousel();
  };

  const setupTechNewsCarousel = () => {
    const viewport = document.getElementById('homeTechNewsViewport');
    const left = document.getElementById('newsArrowLeft');
    const right = document.getElementById('newsArrowRight');

    if (!newsContainer || !viewport || !left || !right) return;
    if (left.dataset.bound === '1') return;

    const updateArrows = () => {
      // Max scroll can be fractional-ish depending on layout; tolerate a small epsilon.
      const maxScrollLeft = Math.max(0, viewport.scrollWidth - viewport.clientWidth);
      const cur = viewport.scrollLeft;
      const epsilon = 2;

      const atStart = cur <= epsilon;
      const atEnd = cur >= (maxScrollLeft - epsilon);

      left.disabled = atStart;
      right.disabled = atEnd;
      left.setAttribute('aria-disabled', atStart ? 'true' : 'false');
      right.setAttribute('aria-disabled', atEnd ? 'true' : 'false');
    };

    const getStepPx = () => {
      const firstCard = newsContainer.querySelector('.feature-card');
      if (!firstCard) return Math.max(280, Math.floor(viewport.clientWidth * 0.9));

      const style = window.getComputedStyle(newsContainer);
      const gap = parseFloat(style.gap || style.columnGap || '0') || 0;
      return firstCard.getBoundingClientRect().width + gap;
    };

    const scrollByCards = (direction) => {
      viewport.scrollBy({ left: direction * getStepPx(), behavior: 'smooth' });
    };

    left.addEventListener('click', () => scrollByCards(-1));
    right.addEventListener('click', () => scrollByCards(1));

    viewport.addEventListener('scroll', updateArrows, { passive: true });
    window.addEventListener('resize', updateArrows);
    updateArrows();

    left.dataset.bound = '1';
    right.dataset.bound = '1';
  };

  const boot = async () => {
    if (latestContainer) setLoading(latestContainer, 'Loading latest discussions…');
    if (newsContainer) setLoading(newsContainer, 'Loading tech news…');
    if (resourcesContainer) setLoading(resourcesContainer, 'Loading featured resources…');

    const tasks = [];

    if (latestContainer) {
      tasks.push(
        fetchJson('/api/posts?page=1&limit=3&sort=newest')
          .then((data) => renderLatestDiscussions(data && data.posts))
          .catch(() => setError(latestContainer, 'Open the forum to see the newest posts.', '/forum.html', 'Open Forum'))
      );
    }

    if (resourcesContainer) {
      tasks.push(
        fetchJson('/api/resources?page=1&limit=3')
          .then((data) => renderFeaturedResources(data && data.items))
          .catch(() => setError(resourcesContainer, 'Browse resources to see curated picks.', '/resources.html', 'Browse Resources'))
      );
    }

    if (newsContainer) {
      tasks.push(
        fetchJson('/api/news?limit=12')
          .then((data) => renderTechNews(data && data.items))
          .catch(() => setError(newsContainer, 'Tech news is temporarily unavailable.', '/', 'Refresh'))
      );
    }

    await Promise.allSettled(tasks);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    void boot();
  }
})();
