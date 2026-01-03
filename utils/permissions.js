/**
 * utils/permissions.js
 *
 * Permission computation helpers.
 *
 * This project supports:
 * - Legacy `user.role` (member/moderator/admin)
 * - New RBAC roles via Role documents (user.roles)
 * - Superadmin override (user.isSuperAdmin)
 */
const Role = require('../models/Role');
const { ALL_PERMISSION_NAMES } = require('./permissionsCatalog');

const LEGACY_ROLE_MAP = Object.freeze({
  member: [],
  moderator: [
    'admin:access',
    'system:stats:read',
    'posts:pin:any',
    'posts:delete:any',
  ],
  admin: ALL_PERMISSION_NAMES,
});

const normalizePermissions = (perms) => {
  return Array.from(new Set((perms || []).filter(Boolean).map(String))).sort();
};

const computePermissionsForUser = async (user) => {
  if (!user) return [];

  if (user.isSuperAdmin) {
    return ALL_PERMISSION_NAMES;
  }

  const roleIds = Array.isArray(user.roles) ? user.roles : [];
  let roleDocs = [];

  // If roles are populated, they look like objects with permissions.
  if (roleIds.length && typeof roleIds[0] === 'object' && roleIds[0] && roleIds[0].permissions) {
    roleDocs = roleIds;
  } else if (roleIds.length) {
    roleDocs = await Role.find({ _id: { $in: roleIds } }).select('permissions');
  }

  const fromCustomRoles = roleDocs.flatMap(r => Array.isArray(r.permissions) ? r.permissions : []);
  const fromLegacyRole = LEGACY_ROLE_MAP[String(user.role || 'member')] || [];

  return normalizePermissions([...fromCustomRoles, ...fromLegacyRole]);
};

const userHasPermission = (permissions, permissionName) => {
  if (!permissionName) return true;
  const set = new Set((permissions || []).map(String));
  return set.has(String(permissionName));
};

module.exports = {
  computePermissionsForUser,
  userHasPermission,
};
