/**
 * public/js/theme.js
 *
 * Theme manager (light/dark).
 *
 * Reads/writes the theme from localStorage and provides a toggle button.
 * Works with theme-init.js which applies the theme as early as possible.
 */
class ThemeManager {
  constructor() {
    this.theme = 'light';
    try {
      this.theme = localStorage.getItem('theme') || 'light';
    } catch {
      // ignore storage failures
    }
    this.init();
  }

  init() {
    // Apply saved theme
    document.documentElement.setAttribute('data-theme', this.theme);
    
    // Create theme toggle button
    this.createToggleButton();
    
    // Update toggle button state
    this.updateToggleButton();
  }

  // Called by other scripts (e.g., auth.js) after they re-render the header
  initializeToggle() {
    this.createToggleButton();
    this.updateToggleButton();
  }

  createToggleButton() {
    const toggleBtn = document.getElementById('themeToggle');
    if (toggleBtn) {
      // Avoid stacking multiple handlers if initializeToggle is called repeatedly.
      if (toggleBtn.dataset.themeBound === '1') return;

      toggleBtn.addEventListener('click', () => this.toggle());
      toggleBtn.dataset.themeBound = '1';
    }
  }

  toggle() {
    this.theme = this.theme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', this.theme);
    try {
      localStorage.setItem('theme', this.theme);
    } catch {
      // ignore storage failures
    }
    this.updateToggleButton();
    
    // Animate transition
    document.body.style.transition = 'background-color 0.3s ease, color 0.3s ease';
  }

  updateToggleButton() {
    const toggleBtn = document.getElementById('themeToggle');
    if (toggleBtn) {
      const icon = toggleBtn.querySelector('.theme-icon');
      if (icon) {
        icon.textContent = this.theme === 'light' ? '🌙' : '☀️';
      }
      toggleBtn.setAttribute('aria-label', 
        `Switch to ${this.theme === 'light' ? 'dark' : 'light'} mode`
      );
    }
  }
}

// Back to Top Button
class BackToTop {
  constructor() {
    this.button = this.createButton();
    this.init();
  }

  createButton() {
    const btn = document.createElement('button');
    btn.id = 'backToTop';
    btn.className = 'back-to-top';
    btn.innerHTML = '↑';
    btn.setAttribute('aria-label', 'Back to top');
    btn.style.display = 'none';
    document.body.appendChild(btn);
    return btn;
  }

  init() {
    // Show/hide on scroll
    window.addEventListener('scroll', () => {
      if (window.pageYOffset > 300) {
        this.button.style.display = 'flex';
      } else {
        this.button.style.display = 'none';
      }
    });

    // Scroll to top on click
    this.button.addEventListener('click', () => {
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    });
  }
}

// Form Validator
class FormValidator {
  constructor(form) {
    this.form = form;
    this.init();
  }

  init() {
    const inputs = this.form.querySelectorAll('input, textarea, select');
    
    inputs.forEach(input => {
      // Real-time validation
      input.addEventListener('input', () => this.validateField(input));
      input.addEventListener('blur', () => this.validateField(input));
    });

    // Form submission validation
    this.form.addEventListener('submit', (e) => {
      if (!this.validateForm()) {
        e.preventDefault();
      }
    });
  }

  validateField(field) {
    const value = field.value.trim();
    const type = field.type;
    const name = field.name;
    let isValid = true;
    let errorMessage = '';

    // Required validation
    if (field.hasAttribute('required') && !value) {
      isValid = false;
      errorMessage = 'This field is required';
    }

    // Email validation
    if (type === 'email' && value) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        isValid = false;
        errorMessage = 'Please enter a valid email address';
      }
    }

    // Password validation
    if (type === 'password' && value) {
      if (value.length < 6) {
        isValid = false;
        errorMessage = 'Password must be at least 6 characters';
      }
    }

    // Username validation
    if (name === 'username' && value) {
      if (value.length < 3) {
        isValid = false;
        errorMessage = 'Username must be at least 3 characters';
      }
      if (!/^[a-zA-Z0-9_]+$/.test(value)) {
        isValid = false;
        errorMessage = 'Username can only contain letters, numbers, and underscores';
      }
    }

    // Post title validation
    if (name === 'title' && value) {
      if (value.length > 200) {
        isValid = false;
        errorMessage = 'Title must be less than 200 characters';
      }
    }

    // Post content validation
    if (name === 'content' && value) {
      if (value.length < 10) {
        isValid = false;
        errorMessage = 'Content must be at least 10 characters';
      }
      if (value.length > 5000) {
        isValid = false;
        errorMessage = 'Content must be less than 5000 characters';
      }
    }

    this.showValidation(field, isValid, errorMessage);
    return isValid;
  }

  validateForm() {
    const inputs = this.form.querySelectorAll('input, textarea, select');
    let isValid = true;

    inputs.forEach(input => {
      if (!this.validateField(input)) {
        isValid = false;
      }
    });

    return isValid;
  }

  showValidation(field, isValid, errorMessage) {
    // Remove existing error
    const existingError = field.parentElement.querySelector('.field-error');
    if (existingError) {
      existingError.remove();
    }

    field.classList.remove('field-valid', 'field-invalid');

    if (!field.value.trim()) {
      return; // Don't show validation for empty fields unless submitted
    }

    if (isValid) {
      field.classList.add('field-valid');
    } else {
      field.classList.add('field-invalid');
      
      // Add error message
      const errorDiv = document.createElement('div');
      errorDiv.className = 'field-error';
      errorDiv.textContent = errorMessage;
      field.parentElement.appendChild(errorDiv);
    }
  }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  // Initialize theme manager
  if (!window.themeManager) {
    window.themeManager = new ThemeManager();
  } else {
    window.themeManager.initializeToggle();
  }
  
  // Initialize back to top button
  new BackToTop();
  
  // Initialize form validators for all forms
  const forms = document.querySelectorAll('form');
  forms.forEach(form => {
    new FormValidator(form);
  });
});
