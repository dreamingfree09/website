// Central permission catalog.
// Convention: <area>:<resource>:<action>[:scope]

const PERMISSIONS = Object.freeze({
  // Admin panel access
  ADMIN_ACCESS: 'admin:access',

  // Curated tags
  TAGS_READ: 'tags:read',
  TAGS_MANAGE: 'tags:manage',

  // Curated resources library
  RESOURCES_READ: 'resources:read',
  RESOURCES_CREATE: 'resources:create',
  RESOURCES_UPDATE: 'resources:update',
  RESOURCES_DELETE: 'resources:delete',

  // Site content
  PATHWAYS_MANAGE: 'pathways:manage',

  // Site portfolio (staff curated)
  SITE_PORTFOLIO_MANAGE: 'sitePortfolio:manage',

  // Users / accounts
  USERS_READ_ANY: 'users:read:any',
  USERS_UPDATE_ANY: 'users:update:any',
  USERS_ROLE_ASSIGN: 'users:role:assign',
  USERS_SUPERADMIN_ASSIGN: 'users:superadmin:assign',
  USERS_SUSPEND_ANY: 'users:suspend:any',
  USERS_UNSUSPEND_ANY: 'users:unsuspend:any',
  USERS_DELETE_ANY: 'users:delete:any',

  // Roles / permissions
  ROLES_READ: 'roles:read',
  ROLES_CREATE: 'roles:create',
  ROLES_UPDATE: 'roles:update',
  ROLES_DELETE: 'roles:delete',
  PERMISSIONS_READ: 'permissions:read',

  // Forum posts
  POSTS_CREATE: 'posts:create',
  POSTS_EDIT_OWN: 'posts:edit:own',
  POSTS_EDIT_ANY: 'posts:edit:any',
  POSTS_DELETE_OWN: 'posts:delete:own',
  POSTS_DELETE_ANY: 'posts:delete:any',
  POSTS_RESTORE_ANY: 'posts:restore:any',
  POSTS_PIN_ANY: 'posts:pin:any',

  // Replies
  REPLIES_CREATE: 'replies:create',
  REPLIES_EDIT_OWN: 'replies:edit:own',
  REPLIES_EDIT_ANY: 'replies:edit:any',
  REPLIES_DELETE_OWN: 'replies:delete:own',
  REPLIES_DELETE_ANY: 'replies:delete:any',
  REPLIES_RESTORE_ANY: 'replies:restore:any',
  REPLIES_ACCEPT_OVERRIDE: 'replies:accept:override',

  // Voting & reputation
  VOTES_CAST: 'votes:cast',
  REPUTATION_ADJUST_ANY: 'reputation:adjust:any',

  // Badges
  BADGES_GRANT_ANY: 'badges:grant:any',
  BADGES_REVOKE_ANY: 'badges:revoke:any',

  // Chat
  CHAT_ROOM_CREATE_PUBLIC: 'chat:room:create:public',
  CHAT_ROOM_CREATE_PRIVATE: 'chat:room:create:private',
  CHAT_ROOM_DELETE_ANY: 'chat:room:delete:any',
  CHAT_MESSAGE_DELETE_ANY: 'chat:message:delete:any',
  CHAT_MESSAGE_EDIT_ANY: 'chat:message:edit:any',
  CHAT_MODERATE: 'chat:moderate',

  // Uploads / media
  UPLOADS_DELETE_ANY: 'uploads:delete:any',

  // Audit + system
  AUDIT_READ: 'audit:read',
  SYSTEM_LOGS_READ: 'system:logs:read',
  SYSTEM_STATS_READ: 'system:stats:read',
});

const PERMISSION_GROUPS = Object.freeze([
  {
    group: 'Admin',
    permissions: [
      PERMISSIONS.ADMIN_ACCESS,
      PERMISSIONS.PERMISSIONS_READ,
      PERMISSIONS.ROLES_READ,
      PERMISSIONS.ROLES_CREATE,
      PERMISSIONS.ROLES_UPDATE,
      PERMISSIONS.ROLES_DELETE,
      PERMISSIONS.AUDIT_READ,
      PERMISSIONS.SYSTEM_STATS_READ,
      PERMISSIONS.SYSTEM_LOGS_READ,
    ],
  },
  {
    group: 'Users',
    permissions: [
      PERMISSIONS.USERS_READ_ANY,
      PERMISSIONS.USERS_UPDATE_ANY,
      PERMISSIONS.USERS_ROLE_ASSIGN,
      PERMISSIONS.USERS_SUPERADMIN_ASSIGN,
      PERMISSIONS.USERS_SUSPEND_ANY,
      PERMISSIONS.USERS_UNSUSPEND_ANY,
      PERMISSIONS.USERS_DELETE_ANY,
    ],
  },
  {
    group: 'Forum',
    permissions: [
      PERMISSIONS.POSTS_CREATE,
      PERMISSIONS.POSTS_EDIT_OWN,
      PERMISSIONS.POSTS_EDIT_ANY,
      PERMISSIONS.POSTS_DELETE_OWN,
      PERMISSIONS.POSTS_DELETE_ANY,
      PERMISSIONS.POSTS_RESTORE_ANY,
      PERMISSIONS.POSTS_PIN_ANY,
      PERMISSIONS.REPLIES_CREATE,
      PERMISSIONS.REPLIES_EDIT_OWN,
      PERMISSIONS.REPLIES_EDIT_ANY,
      PERMISSIONS.REPLIES_DELETE_OWN,
      PERMISSIONS.REPLIES_DELETE_ANY,
      PERMISSIONS.REPLIES_RESTORE_ANY,
      PERMISSIONS.REPLIES_ACCEPT_OVERRIDE,
      PERMISSIONS.VOTES_CAST,
    ],
  },
  {
    group: 'Gamification',
    permissions: [
      PERMISSIONS.REPUTATION_ADJUST_ANY,
      PERMISSIONS.BADGES_GRANT_ANY,
      PERMISSIONS.BADGES_REVOKE_ANY,
    ],
  },
  {
    group: 'Chat',
    permissions: [
      PERMISSIONS.CHAT_ROOM_CREATE_PUBLIC,
      PERMISSIONS.CHAT_ROOM_CREATE_PRIVATE,
      PERMISSIONS.CHAT_ROOM_DELETE_ANY,
      PERMISSIONS.CHAT_MESSAGE_DELETE_ANY,
      PERMISSIONS.CHAT_MESSAGE_EDIT_ANY,
      PERMISSIONS.CHAT_MODERATE,
    ],
  },
  {
    group: 'Uploads',
    permissions: [PERMISSIONS.UPLOADS_DELETE_ANY],
  },
  {
    group: 'Tags',
    permissions: [
      PERMISSIONS.TAGS_READ,
      PERMISSIONS.TAGS_MANAGE,
    ],
  },
  {
    group: 'Resources',
    permissions: [
      PERMISSIONS.RESOURCES_READ,
      PERMISSIONS.RESOURCES_CREATE,
      PERMISSIONS.RESOURCES_UPDATE,
      PERMISSIONS.RESOURCES_DELETE,
    ],
  },
  {
    group: 'Pathways',
    permissions: [
      PERMISSIONS.PATHWAYS_MANAGE,
    ],
  },
  {
    group: 'Site Portfolio',
    permissions: [
      PERMISSIONS.SITE_PORTFOLIO_MANAGE,
    ],
  },
]);

const ALL_PERMISSION_NAMES = Object.freeze(
  Array.from(new Set(PERMISSION_GROUPS.flatMap(g => g.permissions))).sort()
);

module.exports = {
  PERMISSIONS,
  PERMISSION_GROUPS,
  ALL_PERMISSION_NAMES,
};
