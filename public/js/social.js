/**
 * Social Features Manager for Piqniq Platform
 * Handles following/unfollowing users and displaying social information
 */

class SocialManager {
  constructor() {
    this.currentUser = null;
    this.following = [];
  }

  /**
   * Initialize social features
   */
  async init() {
    await this.loadCurrentUser();
    this.initFollowButtons();
    this.loadFollowersCount();
    this.loadFollowingCount();
  }

  /**
   * Load current user info
   */
  async loadCurrentUser() {
    try {
      const response = await fetch('/api/auth/me', {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        this.currentUser = data.user;
        this.following = data.user.following || [];
      }
    } catch (error) {
      console.error('Failed to load user:', error);
    }
  }

  /**
   * Initialize follow/unfollow buttons
   */
  initFollowButtons() {
    document.addEventListener('click', async (e) => {
      const followBtn = e.target.closest('.follow-btn');
      if (!followBtn) return;

      e.preventDefault();
      const userId = followBtn.dataset.userId;
      if (!userId) return;

      await this.toggleFollow(userId, followBtn);
    });
  }

  /**
   * Toggle follow/unfollow for a user
   */
  async toggleFollow(userId, button) {
    if (!this.currentUser) {
      window.location.href = '/login.html';
      return;
    }

    try {
      button.disabled = true;
      const response = await fetch(`/api/social/follow/${userId}`, {
        method: 'POST',
        credentials: 'include'
      });

      const data = await response.json();

      if (response.ok) {
        const isFollowing = data.isFollowing;
        
        // Update button
        button.textContent = isFollowing ? 'Unfollow' : 'Follow';
        button.classList.toggle('following', isFollowing);

        // Update local following list
        if (isFollowing) {
          this.following.push(userId);
        } else {
          this.following = this.following.filter(id => id !== userId);
        }

        // Update followers count if element exists
        const followerCount = document.querySelector(`[data-user-id="${userId}"] .followers-count`);
        if (followerCount) {
          const currentCount = parseInt(followerCount.textContent) || 0;
          followerCount.textContent = isFollowing ? currentCount + 1 : currentCount - 1;
        }

        this.showNotification(
          isFollowing ? 'Now following user!' : 'Unfollowed user',
          'success'
        );
      } else {
        this.showNotification(data.error || 'Failed to update follow status', 'error');
      }
    } catch (error) {
      console.error('Follow toggle error:', error);
      this.showNotification('Network error. Please try again.', 'error');
    } finally {
      button.disabled = false;
    }
  }

  /**
   * Check if currently following a user
   */
  isFollowing(userId) {
    return this.following.includes(userId);
  }

  /**
   * Load and display followers count
   */
  async loadFollowersCount() {
    const followerElements = document.querySelectorAll('[data-followers-for]');
    
    for (const element of followerElements) {
      const userId = element.dataset.followersFor;
      try {
        const response = await fetch(`/api/social/followers/${userId}`, {
          credentials: 'include'
        });

        if (response.ok) {
          const data = await response.json();
          element.textContent = data.followers.length;
        }
      } catch (error) {
        console.error('Failed to load followers count:', error);
      }
    }
  }

  /**
   * Load and display following count
   */
  async loadFollowingCount() {
    const followingElements = document.querySelectorAll('[data-following-for]');
    
    for (const element of followingElements) {
      const userId = element.dataset.followingFor;
      try {
        const response = await fetch(`/api/social/following/${userId}`, {
          credentials: 'include'
        });

        if (response.ok) {
          const data = await response.json();
          element.textContent = data.following.length;
        }
      } catch (error) {
        console.error('Failed to load following count:', error);
      }
    }
  }

  /**
   * Load personalized feed from followed users
   */
  async loadPersonalizedFeed() {
    try {
      const response = await fetch('/api/social/feed', {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        return data.posts;
      }
      return [];
    } catch (error) {
      console.error('Failed to load personalized feed:', error);
      return [];
    }
  }

  /**
   * Load user suggestions (users to follow)
   */
  async loadUserSuggestions() {
    try {
      const response = await fetch('/api/social/suggestions', {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        return data.users;
      }
      return [];
    } catch (error) {
      console.error('Failed to load user suggestions:', error);
      return [];
    }
  }

  /**
   * Display user suggestions in the UI
   */
  async displayUserSuggestions(containerId = 'user-suggestions') {
    const container = document.getElementById(containerId);
    if (!container) return;

    const users = await this.loadUserSuggestions();

    if (users.length === 0) {
      container.innerHTML = '<p class="text-muted">No suggestions available</p>';
      return;
    }

    container.innerHTML = users.map(user => `
      <div class="user-suggestion-card" data-user-id="${user._id}">
        <img src="${user.avatar || '/Images/default-avatar.png'}" 
             alt="${user.username}" 
             class="suggestion-avatar">
        <div class="suggestion-info">
          <h4>${user.username}</h4>
          <p class="reputation">⭐ ${user.reputation} reputation</p>
          <p class="badge-count">${user.badges.length} badges</p>
        </div>
        <button class="follow-btn" data-user-id="${user._id}">
          Follow
        </button>
      </div>
    `).join('');
  }

  /**
   * Display followers list
   */
  async displayFollowersList(userId, containerId = 'followers-list') {
    const container = document.getElementById(containerId);
    if (!container) return;

    try {
      const response = await fetch(`/api/social/followers/${userId}`, {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        const followers = data.followers;

        if (followers.length === 0) {
          container.innerHTML = '<p class="text-muted">No followers yet</p>';
          return;
        }

        container.innerHTML = followers.map(user => `
          <div class="follower-card" data-user-id="${user._id}">
            <img src="${user.avatar || '/Images/default-avatar.png'}" 
                 alt="${user.username}" 
                 class="follower-avatar">
            <div class="follower-info">
              <h4><a href="/profile.html?user=${user.username}">${user.username}</a></h4>
              <p class="reputation">⭐ ${user.reputation} reputation</p>
            </div>
          </div>
        `).join('');
      }
    } catch (error) {
      console.error('Failed to load followers:', error);
      container.innerHTML = '<p class="text-danger">Failed to load followers</p>';
    }
  }

  /**
   * Display following list
   */
  async displayFollowingList(userId, containerId = 'following-list') {
    const container = document.getElementById(containerId);
    if (!container) return;

    try {
      const response = await fetch(`/api/social/following/${userId}`, {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        const following = data.following;

        if (following.length === 0) {
          container.innerHTML = '<p class="text-muted">Not following anyone yet</p>';
          return;
        }

        container.innerHTML = following.map(user => `
          <div class="following-card" data-user-id="${user._id}">
            <img src="${user.avatar || '/Images/default-avatar.png'}" 
                 alt="${user.username}" 
                 class="following-avatar">
            <div class="following-info">
              <h4><a href="/profile.html?user=${user.username}">${user.username}</a></h4>
              <p class="reputation">⭐ ${user.reputation} reputation</p>
            </div>
            <button class="follow-btn following" data-user-id="${user._id}">
              Unfollow
            </button>
          </div>
        `).join('');
      }
    } catch (error) {
      console.error('Failed to load following:', error);
      container.innerHTML = '<p class="text-danger">Failed to load following</p>';
    }
  }

  /**
   * Show notification
   */
  showNotification(message, type = 'info') {
    if (window.notificationsManager) {
      notificationsManager.addNotification({
        type: type,
        message: message
      });
    } else {
      console.log(`[${type}] ${message}`);
    }
  }
}

// Global instance
window.socialManager = new SocialManager();

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    socialManager.init();
  });
} else {
  socialManager.init();
}
