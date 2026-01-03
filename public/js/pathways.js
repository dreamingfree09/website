/**
 * public/js/pathways.js
 *
 * Pathways page loader.
 *
 * Fetches the staff-maintained Pathways HTML from `/api/site-content/pathways`
 * and injects it into the page container.
 */
(function () {
  const mount = document.getElementById('pathwaysManagedHtml');
  if (!mount) return;

  // The CMS-managed content historically included a large card grid UX.
  // The primary Pathways UX is now the compact Role Explorer above, so we
  // remove legacy sections during injection to avoid reintroducing big cards.
  const LEGACY_SELECTORS = [
    '.pathways-grid',
    '.pathway-card',
    '.getting-started',
    '.pathways-hero',
    '.pathways-intro',
  ];

  const load = async () => {
    try {
      const res = await fetch('/api/site-content/pathways?render=1');
      const data = await res.json();
      if (!res.ok) return;
      if (data?.content?.html) {
        const wrapper = document.createElement('div');
        wrapper.innerHTML = String(data.content.html);

        wrapper
          .querySelectorAll(LEGACY_SELECTORS.join(','))
          .forEach((el) => el.remove());

        mount.innerHTML = wrapper.innerHTML;
      }
    } catch {
      // ignore; fallback content stays
    }
  };

  document.addEventListener('DOMContentLoaded', load);
})();
