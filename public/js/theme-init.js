/**
 * public/js/theme-init.js
 *
 * Early theme bootstrap.
 *
 * Runs before most other scripts and before the first render completes to reduce
 * “flash of default theme” on initial page load.
 *
 * Responsibilities:
 * - Read the persisted theme from localStorage (best-effort)
 * - Apply it to <html data-theme="..."> immediately
 * - Enable transitions only after first paint to avoid animating initial render
 */
(() => {
  try {
    const theme = localStorage.getItem('theme');
    if (theme === 'dark' || theme === 'light') {
      document.documentElement.setAttribute('data-theme', theme);
    }
  } catch {
    // Ignore storage access failures.
  }

  // Enable transitions only after the first paint to avoid animating the initial load.
  const enableTransitions = () => {
    document.documentElement.classList.add('theme-transitions');
  };

  if (typeof requestAnimationFrame === 'function') {
    requestAnimationFrame(() => requestAnimationFrame(enableTransitions));
  } else {
    setTimeout(enableTransitions, 0);
  }
})();
