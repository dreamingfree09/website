/**
 * public/js/image-upload.js
 *
 * Image upload UI helpers for avatars and post images.
 *
 * Enforces basic client-side checks (type/size) before sending to the server.
 * Server-side validation still applies via multer configuration.
 */

class ImageUploadManager {
  constructor() {
    this.maxAvatarSize = 5 * 1024 * 1024; // 5MB
    this.maxPostImageSize = 10 * 1024 * 1024; // 10MB
    this.allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  }

  /**
   * Initialize avatar upload functionality
   */
  initAvatarUpload() {
    const avatarInput = document.getElementById('avatar-upload-input');
    const avatarBtn = document.getElementById('avatar-upload-btn');
    const avatarPreview = document.getElementById('avatar-preview');

    if (!avatarInput || !avatarBtn) return;

    avatarBtn.addEventListener('click', () => avatarInput.click());

    avatarInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      // Validate file
      const validation = this.validateImage(file, this.maxAvatarSize);
      if (!validation.valid) {
        this.showError(validation.error);
        return;
      }

      // Show preview
      this.showImagePreview(file, avatarPreview);

      // Upload
      await this.uploadAvatar(file);
    });
  }

  /**
   * Initialize post image upload functionality
   */
  initPostImageUpload() {
    const imageInput = document.getElementById('post-image-input');
    const imageBtn = document.getElementById('add-image-btn');
    const imagePreview = document.getElementById('post-image-preview');
    const removeBtn = document.getElementById('remove-image-btn');

    if (!imageInput || !imageBtn) return;

    imageBtn.addEventListener('click', () => imageInput.click());

    imageInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      // Validate file
      const validation = this.validateImage(file, this.maxPostImageSize);
      if (!validation.valid) {
        this.showError(validation.error);
        return;
      }

      // Show preview
      this.showImagePreview(file, imagePreview);
      imagePreview.style.display = 'block';
      if (removeBtn) removeBtn.style.display = 'inline-block';

      // Upload
      const imageUrl = await this.uploadPostImage(file);
      if (imageUrl) {
        imagePreview.dataset.imageUrl = imageUrl;
      }
    });

    if (removeBtn) {
      removeBtn.addEventListener('click', () => {
        imagePreview.style.display = 'none';
        imagePreview.innerHTML = '';
        delete imagePreview.dataset.imageUrl;
        imageInput.value = '';
        removeBtn.style.display = 'none';
      });
    }
  }

  /**
   * Validate image file
   */
  validateImage(file, maxSize) {
    if (!this.allowedTypes.includes(file.type)) {
      return {
        valid: false,
        error: 'Please upload a valid image (JPEG, PNG, GIF, or WebP)'
      };
    }

    if (file.size > maxSize) {
      const maxSizeMB = maxSize / (1024 * 1024);
      return {
        valid: false,
        error: `Image size must be less than ${maxSizeMB}MB`
      };
    }

    return { valid: true };
  }

  /**
   * Show image preview
   */
  showImagePreview(file, previewElement) {
    const reader = new FileReader();
    reader.onload = (e) => {
      previewElement.innerHTML = `
        <img src="${e.target.result}" 
             alt="Preview" 
             style="max-width: 100%; max-height: 200px; border-radius: 8px; object-fit: cover;">
      `;
    };
    reader.readAsDataURL(file);
  }

  /**
   * Upload avatar to server
   */
  async uploadAvatar(file) {
    const formData = new FormData();
    formData.append('avatar', file);

    try {
      const response = await fetch('/api/upload/avatar', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });

      const data = await response.json();

      if (response.ok) {
        this.showSuccess('Avatar updated successfully!');
        
        // Update avatar in UI
        const currentAvatar = document.querySelector('.profile-avatar, .user-avatar');
        if (currentAvatar) {
          currentAvatar.src = data.avatarUrl;
        }

        // Reload page after 1 second to refresh all avatar instances
        setTimeout(() => window.location.reload(), 1000);
      } else {
        this.showError(data.error || 'Failed to upload avatar');
      }
    } catch (error) {
      console.error('Avatar upload error:', error);
      this.showError('Network error. Please try again.');
    }
  }

  /**
   * Upload post image to server
   */
  async uploadPostImage(file) {
    const formData = new FormData();
    formData.append('postImage', file);

    try {
      const response = await fetch('/api/upload/post-image', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });

      const data = await response.json();

      if (response.ok) {
        this.showSuccess('Image uploaded successfully!');
        return data.imageUrl;
      } else {
        this.showError(data.error || 'Failed to upload image');
        return null;
      }
    } catch (error) {
      console.error('Post image upload error:', error);
      this.showError('Network error. Please try again.');
      return null;
    }
  }

  /**
   * Get uploaded post image URL from preview element
   */
  getPostImageUrl() {
    const preview = document.getElementById('post-image-preview');
    return preview ? preview.dataset.imageUrl : null;
  }

  /**
   * Show error message
   */
  showError(message) {
    // Use existing notification system if available
    if (window.notificationsManager) {
      notificationsManager.addNotification({
        type: 'error',
        message: message
      });
    } else {
      alert(message);
    }
  }

  /**
   * Show success message
   */
  showSuccess(message) {
    // Use existing notification system if available
    if (window.notificationsManager) {
      notificationsManager.addNotification({
        type: 'success',
        message: message
      });
    } else {
      alert(message);
    }
  }
}

// Global instance
window.imageUploadManager = new ImageUploadManager();

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    imageUploadManager.initAvatarUpload();
    imageUploadManager.initPostImageUpload();
  });
} else {
  imageUploadManager.initAvatarUpload();
  imageUploadManager.initPostImageUpload();
}
