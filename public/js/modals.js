/**
 * public/js/modals.js
 *
 * Shared modal wiring.
 *
 * Attaches click handlers to open/close sign-in/register/about/contact and
 * other modals where present.
 */
document.addEventListener('DOMContentLoaded', () => {
  const signInButton = document.getElementById("signIn");
  const registerButton = document.getElementById("register");
  const signInModal = document.getElementById("signInModal");
  const registerModal = document.getElementById("registerModal");
  const contactButton = document.getElementById("contactButton");
  const aboutButton = document.getElementById("aboutButton");
  const contactModal = document.getElementById("contactModal");
  const aboutModal = document.getElementById("aboutModal");
  const createPostModal = document.getElementById("createPostModal");

  // Handle cases where buttons might not exist after auth.updateUI() replaces them
  function setupModalButtons() {
    const currentSignIn = document.getElementById("signIn");
    const currentRegister = document.getElementById("register");
    
    if (currentSignIn && !currentSignIn.hasAttribute('data-listener')) {
      currentSignIn.setAttribute('data-listener', 'true');
      currentSignIn.addEventListener("click", () => {
        if (signInModal) signInModal.style.display = "block";
      });
    }
    
    if (currentRegister && !currentRegister.hasAttribute('data-listener')) {
      currentRegister.setAttribute('data-listener', 'true');
      currentRegister.addEventListener("click", () => {
        if (registerModal) registerModal.style.display = "block";
      });
    }
  }
  
  // Setup initially
  setupModalButtons();

  // If the server redirected here because a page requires auth,
  // open the sign-in modal automatically.
  try {
    const params = new URLSearchParams(window.location.search);
    const authRequired = params.get('auth') === 'required';
    if (authRequired && signInModal) {
      signInModal.style.display = 'block';
    }
  } catch {
    // ignore
  }
  
  // Re-setup after auth UI updates (using MutationObserver)
  const authButtons = document.querySelector('.auth-buttons');
  if (authButtons) {
    const observer = new MutationObserver(() => {
      setupModalButtons();
    });
    observer.observe(authButtons, { childList: true, subtree: true });
  }

  // Open modals
  if (contactButton) {
    contactButton.addEventListener("click", (e) => {
      e.preventDefault();
      if (contactModal) contactModal.style.display = "block";
    });
  }

  if (aboutButton) {
    aboutButton.addEventListener("click", (e) => {
      e.preventDefault();
      if (aboutModal) aboutModal.style.display = "block";
    });
  }

  // CTA section buttons
  const ctaSignInBtn = document.getElementById('ctaSignInBtn');
  const ctaRegisterBtn = document.getElementById('ctaRegisterBtn');
  
  if (ctaSignInBtn) {
    ctaSignInBtn.addEventListener('click', () => {
      if (signInModal) signInModal.style.display = 'block';
    });
  }
  
  if (ctaRegisterBtn) {
    ctaRegisterBtn.addEventListener('click', () => {
      if (registerModal) registerModal.style.display = 'block';
    });
  }

  // Create first post button
  const createFirstPostBtn = document.getElementById('createFirstPostBtn');
  if (createFirstPostBtn) {
    createFirstPostBtn.addEventListener('click', () => {
      const createPostBtn = document.getElementById('createPostBtn');
      if (createPostBtn) createPostBtn.click();
    });
  }

  // Prevent default on social icons
  const socialIcons = document.querySelectorAll('.social-icon');
  socialIcons.forEach(icon => {
    icon.addEventListener('click', (e) => {
      e.preventDefault();
    });
  });

  // Close modals when clicking outside
  window.addEventListener("click", (event) => {
    if (event.target.classList.contains("modal")) {
      if (signInModal) signInModal.style.display = "none";
      if (registerModal) registerModal.style.display = "none";
      if (contactModal) contactModal.style.display = "none";
      if (aboutModal) aboutModal.style.display = "none";
      if (createPostModal) createPostModal.style.display = "none";
    }
  });

  // Close modals with close buttons
  const closeButtons = document.querySelectorAll(".close-modal");
  closeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      if (signInModal) signInModal.style.display = "none";
      if (registerModal) registerModal.style.display = "none";
      if (contactModal) contactModal.style.display = "none";
      if (aboutModal) aboutModal.style.display = "none";
      if (createPostModal) createPostModal.style.display = "none";
    });
  });
});
