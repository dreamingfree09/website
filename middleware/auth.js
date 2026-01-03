/**
 * middleware/auth.js
 *
 * Auth-related middleware used by API routes.
 *
 * isAuthenticated:
 * - Requires an active session (req.session.userId)
 *
 * requireVerifiedEmail:
 * - Requires authentication
 * - Requires the user's email to be verified (anti-spam/trust signal)
 */
const User = require('../models/User');

// Middleware to check if user is authenticated
const isAuthenticated = (req, res, next) => {
  if (req.session && req.session.userId) {
    return next();
  }
  res.status(401).json({ error: 'Authentication required' });
};

// Middleware to require a verified email (anti-spam / trust signal)
const requireVerifiedEmail = async (req, res, next) => {
  try {
    if (!req.session || !req.session.userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const user = await User.findById(req.session.userId).select('isEmailVerified username role reputation');
    if (!user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    if (!user.isEmailVerified) {
      return res.status(403).json({ error: 'Email verification required' });
    }

    req.currentUser = user;
    return next();
  } catch (error) {
    return res.status(500).json({ error: 'Server error' });
  }
};

module.exports = { isAuthenticated, requireVerifiedEmail };
