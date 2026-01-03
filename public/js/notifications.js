/**
 * public/js/notifications.js
 *
 * Notifications UI.
 *
 * Polls the server periodically and renders a bell + panel.
 * Note: Polling interval trades freshness for server load (currently 30s).
 */
class NotificationsManager {
  constructor() {
    this.notifications = [];
    this.unreadCount = 0;
    this.panel = null;
    this.bellIcon = null;
    this.init();
  }

  init() {
    this.createNotificationBell();
    // If we couldn't attach a bell (unexpected page layout), don't create a panel
    // or global click handlers.
    if (!this.bellIcon) return;
    this.createNotificationPanel();
    this.loadNotifications();
    
    // Poll for new notifications every 30 seconds
    setInterval(() => this.loadNotifications(), 30000);
  }

  createNotificationBell() {
    // All pages use <header><nav>...</nav></header>
    const nav = document.querySelector('header nav');
    if (!nav) return;

    const bellContainer = document.createElement('div');
    bellContainer.className = 'notification-bell';
    bellContainer.innerHTML = `
      <span style="font-size: 24px;">🔔</span>
      <span class="notification-count" style="display: none;">0</span>
    `;

    bellContainer.addEventListener('click', () => this.togglePanel());
    nav.appendChild(bellContainer);
    this.bellIcon = bellContainer;
  }

  createNotificationPanel() {
    const panel = document.createElement('div');
    panel.className = 'notifications-panel';
    panel.innerHTML = `
      <div class="notifications-header">
        <h3>Notifications</h3>
        <button class="mark-all-read">Mark all read</button>
      </div>
      <div class="notifications-list">
        <div class="notifications-empty">
          <p>No notifications yet</p>
        </div>
      </div>
    `;

    document.body.appendChild(panel);
    this.panel = panel;

    // Mark all as read
    panel.querySelector('.mark-all-read').addEventListener('click', () => {
      this.markAllAsRead();
    });

    // Close panel when clicking outside
    document.addEventListener('click', (e) => {
      if (!this.bellIcon) return;
      if (!panel.contains(e.target) && !this.bellIcon.contains(e.target)) {
        panel.classList.remove('show');
      }
    });
  }

  togglePanel() {
    this.panel.classList.toggle('show');
    if (this.panel.classList.contains('show')) {
      this.loadNotifications();
    }
  }

  async loadNotifications() {
    try {
      const response = await fetch('/api/profile/dashboard/me');
      if (!response.ok) return;

      const data = await response.json();
      if (data.notifications) {
        this.notifications = data.notifications;
        this.updateUI();
      }
    } catch (error) {
      console.error('Failed to load notifications:', error);
    }
  }

  updateUI() {
    const unread = this.notifications.filter(n => !n.read);
    this.unreadCount = unread.length;

    // Update bell badge
    const countBadge = this.bellIcon.querySelector('.notification-count');
    if (this.unreadCount > 0) {
      countBadge.textContent = this.unreadCount > 99 ? '99+' : this.unreadCount;
      countBadge.style.display = 'block';
    } else {
      countBadge.style.display = 'none';
    }

    // Update panel list
    const listContainer = this.panel.querySelector('.notifications-list');
    
    if (this.notifications.length === 0) {
      listContainer.innerHTML = `
        <div class="notifications-empty">
          <p>No notifications yet</p>
        </div>
      `;
      return;
    }

    listContainer.innerHTML = this.notifications
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .map(notification => this.renderNotification(notification))
      .join('');

    // Add click handlers
    listContainer.querySelectorAll('.notification-item').forEach((item, index) => {
      item.addEventListener('click', () => {
        const notification = this.notifications[index];
        this.markAsRead(notification._id);
        if (notification.link) {
          window.location.href = notification.link;
        }
      });
    });
  }

  renderNotification(notification) {
    const timeAgo = this.getTimeAgo(notification.createdAt);
    const typeBadge = this.getTypeBadge(notification.type);
    
    return `
      <div class="notification-item ${notification.read ? '' : 'unread'}">
        <div class="notification-content">
          ${typeBadge}
          <div class="notification-message">${notification.message}</div>
          <div class="notification-time">${timeAgo}</div>
        </div>
      </div>
    `;
  }

  getTypeBadge(type) {
    const badges = {
      like: '<span class="notification-type-badge like">❤️ Like</span>',
      reply: '<span class="notification-type-badge reply">💬 Reply</span>',
      badge: '<span class="notification-type-badge badge">🏆 Badge</span>',
      mention: '<span class="notification-type-badge mention">@ Mention</span>',
    };
    return badges[type] || '';
  }

  getTimeAgo(timestamp) {
    const seconds = Math.floor((new Date() - new Date(timestamp)) / 1000);
    
    const intervals = {
      year: 31536000,
      month: 2592000,
      week: 604800,
      day: 86400,
      hour: 3600,
      minute: 60
    };

    for (const [unit, secondsInUnit] of Object.entries(intervals)) {
      const interval = Math.floor(seconds / secondsInUnit);
      if (interval >= 1) {
        return `${interval} ${unit}${interval > 1 ? 's' : ''} ago`;
      }
    }
    
    return 'Just now';
  }

  async markAsRead(notificationId) {
    try {
      await fetch('/api/profile/notifications/read', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId })
      });

      // Update local state
      const notification = this.notifications.find(n => n._id === notificationId);
      if (notification) {
        notification.read = true;
        this.updateUI();
      }
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  }

  async markAllAsRead() {
    try {
      await fetch('/api/profile/notifications/read', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAll: true })
      });

      // Update local state
      this.notifications.forEach(n => n.read = true);
      this.updateUI();
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  }

  // Add a new notification (for real-time updates)
  addNotification(notification) {
    this.notifications.unshift(notification);
    this.updateUI();
    this.showToast(notification);
  }

  showToast(notification) {
    if (typeof window.showMessage === 'function') {
      window.showMessage(notification.message, notification.type === 'badge' ? 'success' : 'info');
      return;
    }
  }

  getToastIcon(type) {
    const icons = {
      like: '❤️',
      reply: '💬',
      badge: '🏆',
      mention: '@',
    };
    return icons[type] || '🔔';
  }
}

// Initialize notifications manager when logged in
document.addEventListener('DOMContentLoaded', () => {
  const currentUser = localStorage.getItem('currentUser');
  if (currentUser) {
    window.notificationsManager = new NotificationsManager();
  }
});
