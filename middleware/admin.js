/**
 * middleware/admin.js
 *
 * Legacy role-based middleware (user.role).
 *
 * Note: This project primarily uses RBAC permissions via middleware/permissions.js.
 * This file remains for backward compatibility in areas that still rely on legacy roles.
 */
const isAdmin = async (req, res, next) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const User = require('../models/User');
    const user = await User.findById(req.session.userId);

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

// Moderator middleware
const isModerator = async (req, res, next) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const User = require('../models/User');
    const user = await User.findById(req.session.userId);

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    if (user.role !== 'admin' && user.role !== 'moderator') {
      return res.status(403).json({ error: 'Moderator access required' });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = { isAdmin, isModerator };
