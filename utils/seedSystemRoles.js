const Role = require('../models/Role');
const { PERMISSIONS, ALL_PERMISSION_NAMES } = require('./permissionsCatalog');

const DEFAULT_SYSTEM_ROLES = Object.freeze([
  {
    name: 'Admin',
    description: 'System role: full admin access.',
    permissions: ALL_PERMISSION_NAMES,
  },
  {
    name: 'Content',
    description: 'System role: can curate and upload resources (no user/role management).',
    permissions: [
      PERMISSIONS.ADMIN_ACCESS,
      PERMISSIONS.RESOURCES_READ,
      PERMISSIONS.RESOURCES_CREATE,
      PERMISSIONS.RESOURCES_UPDATE,
      PERMISSIONS.RESOURCES_DELETE,
      PERMISSIONS.PATHWAYS_MANAGE,
      PERMISSIONS.SITE_PORTFOLIO_MANAGE,
    ],
  },
  {
    name: 'Moderator',
    description: 'System role: moderation and basic admin panel access.',
    permissions: [
      PERMISSIONS.ADMIN_ACCESS,
      PERMISSIONS.SYSTEM_STATS_READ,
      PERMISSIONS.USERS_READ_ANY,
      PERMISSIONS.POSTS_PIN_ANY,
      PERMISSIONS.POSTS_DELETE_ANY,
      PERMISSIONS.POSTS_RESTORE_ANY,
      PERMISSIONS.REPLIES_DELETE_ANY,
      PERMISSIONS.REPLIES_RESTORE_ANY,
      PERMISSIONS.CHAT_MESSAGE_DELETE_ANY,
      PERMISSIONS.CHAT_MESSAGE_EDIT_ANY,
      PERMISSIONS.CHAT_MODERATE,
      PERMISSIONS.UPLOADS_DELETE_ANY,
    ],
  },
]);

const seedSystemRoles = async () => {
  const results = [];

  for (const role of DEFAULT_SYSTEM_ROLES) {
    const permissions = Array.from(new Set(role.permissions.map(String))).sort();

    const existing = await Role.findOne({ name: role.name });
    if (!existing) {
      const created = await Role.create({
        name: role.name,
        description: role.description,
        permissions,
        isSystem: true,
      });

      results.push({ name: role.name, created: true, updated: false, id: String(created._id) });
      continue;
    }

    // Only update system roles; never overwrite custom roles.
    if (existing.isSystem) {
      const before = Array.isArray(existing.permissions) ? existing.permissions : [];
      const changed = JSON.stringify(before.slice().sort()) !== JSON.stringify(permissions);
      if (changed || existing.description !== role.description) {
        existing.description = role.description;
        existing.permissions = permissions;
        await existing.save();
        results.push({ name: role.name, created: false, updated: true });
      } else {
        results.push({ name: role.name, created: false, updated: false });
      }
    } else {
      results.push({
        name: role.name,
        created: false,
        updated: false,
        skipped: true,
        reason: 'Existing role is not system; leaving unchanged',
      });
    }
  }

  return results;
};

module.exports = {
  seedSystemRoles,
};
