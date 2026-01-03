/**
 * public/js/mobile-menu.js
 *
 * Responsive navigation for smaller screens.
 *
 * Adds a hamburger menu toggle and manages open/close behavior, including
 * resize handling.
 */
class MobileMenu {
  constructor() {
    this.isOpen = false;
    this.init();
  }

  init() {
    this.createMobileMenuButton();
    this.setupEventListeners();
    this.handleResize();
  }

  createMobileMenuButton() {
    const header = document.querySelector('header');
    if (!header) return;

    // Check if button already exists
    if (document.getElementById('mobileMenuToggle')) return;

    const menuButton = document.createElement('button');
    menuButton.id = 'mobileMenuToggle';
    menuButton.className = 'mobile-menu-toggle';
    menuButton.setAttribute('aria-label', 'Toggle menu');
    menuButton.innerHTML = `
      <span class="hamburger-line"></span>
      <span class="hamburger-line"></span>
      <span class="hamburger-line"></span>
    `;

    // Insert before branding
    const branding = header.querySelector('#branding');
    if (branding) {
      header.insertBefore(menuButton, branding);
    }
  }

  setupEventListeners() {
    const toggleBtn = document.getElementById('mobileMenuToggle');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => this.toggle());
    }

    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
      const header = document.querySelector('header');
      const toggleBtn = document.getElementById('mobileMenuToggle');
      
      if (this.isOpen && header && !header.contains(e.target) && e.target !== toggleBtn) {
        this.close();
      }
    });

    // Close menu when window is resized to desktop
    window.addEventListener('resize', () => this.handleResize());

    // Close menu on nav link click (mobile)
    document.querySelectorAll('header nav a').forEach(link => {
      link.addEventListener('click', () => {
        if (window.innerWidth <= 768) {
          this.close();
        }
      });
    });
  }

  toggle() {
    this.isOpen ? this.close() : this.open();
  }

  open() {
    const header = document.querySelector('header');
    const toggleBtn = document.getElementById('mobileMenuToggle');
    
    if (header) {
      header.classList.add('mobile-menu-open');
      this.isOpen = true;
    }
    
    if (toggleBtn) {
      toggleBtn.classList.add('active');
      toggleBtn.setAttribute('aria-expanded', 'true');
    }

    // Prevent body scroll when menu is open
    document.body.style.overflow = 'hidden';
  }

  close() {
    const header = document.querySelector('header');
    const toggleBtn = document.getElementById('mobileMenuToggle');
    
    if (header) {
      header.classList.remove('mobile-menu-open');
      this.isOpen = false;
    }
    
    if (toggleBtn) {
      toggleBtn.classList.remove('active');
      toggleBtn.setAttribute('aria-expanded', 'false');
    }

    // Restore body scroll
    document.body.style.overflow = '';
  }

  handleResize() {
    // Close menu if resized to desktop
    if (window.innerWidth > 768 && this.isOpen) {
      this.close();
    }
  }
}

// Initialize
let mobileMenu;
document.addEventListener('DOMContentLoaded', () => {
  mobileMenu = new MobileMenu();
});
