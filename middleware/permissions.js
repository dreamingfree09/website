/**
 * middleware/permissions.js
 *
 * RBAC middleware.
 *
 * attachCurrentUser:
 * - Hydrates req.currentUser from the session (if present)
 * - Computes req.currentPermissions by combining role permissions + superadmin
 *
 * requirePermission(permission):
 * - Enforces authentication
 * - Ensures req.currentPermissions contains the required permission
 */
const User = require('../models/User');
const { computePermissionsForUser, userHasPermission } = require('../utils/permissions');

// Loads the current user from the session and attaches:
// - req.currentUser
// - req.currentPermissions
const attachCurrentUser = async (req, res, next) => {
  try {
    if (!req.session || !req.session.userId) {
      req.currentUser = null;
      req.currentPermissions = [];
      return next();
    }

    const user = await User.findById(req.session.userId)
      .select('-password')
      .populate('roles', 'name permissions');

    if (!user) {
      req.currentUser = null;
      req.currentPermissions = [];
      return next();
    }

    req.currentUser = user;
    req.currentPermissions = await computePermissionsForUser(user);
    return next();
  } catch (error) {
    return res.status(500).json({ error: 'Server error' });
  }
};

const requirePermission = (permissionName) => {
  return async (req, res, next) => {
    try {
      if (!req.session || !req.session.userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      // If attachCurrentUser ran, re-use it.
      if (!req.currentUser) {
        const user = await User.findById(req.session.userId)
          .select('-password')
          .populate('roles', 'name permissions');

        if (!user) {
          return res.status(401).json({ error: 'User not found' });
        }

        req.currentUser = user;
        req.currentPermissions = await computePermissionsForUser(user);
      }

      if (!userHasPermission(req.currentPermissions, permissionName)) {
        return res.status(403).json({ error: 'Permission denied' });
      }

      return next();
    } catch (error) {
      return res.status(500).json({ error: 'Server error' });
    }
  };
};

module.exports = {
  attachCurrentUser,
  requirePermission,
};
