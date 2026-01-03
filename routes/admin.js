/**
 * routes/admin.js
 *
 * Admin panel API.
 *
 * All routes are gated by permissions (RBAC). This module also writes audit logs
 * for security-sensitive operations, but audit failures do not block admin actions.
 */
const express = require('express');
const router = express.Router();
const Post = require('../models/Post');
const User = require('../models/User');
const Role = require('../models/Role');
const AuditLog = require('../models/AuditLog');
const { requirePermission } = require('../middleware/permissions');
const { PERMISSIONS, PERMISSION_GROUPS, ALL_PERMISSION_NAMES } = require('../utils/permissionsCatalog');
const { Logger } = require('../utils/logger');
const { hashIp, hashUserAgent } = require('../utils/privacy');

const toObjectIdArray = (value) => {
  const arr = Array.isArray(value) ? value : [];
  return arr.map(v => String(v).trim()).filter(Boolean);
};

const audit = async (req, action, data = {}) => {
  try {
    if (!req.session?.userId) return;

    const storeRawIp = String(process.env.AUDIT_LOG_STORE_RAW_IP || '').toLowerCase() === 'true';
    const storeRawUserAgent = String(process.env.AUDIT_LOG_STORE_RAW_UA || '').toLowerCase() === 'true';

    const rawIp = String(req.ip || '');
    const rawUa = String(req.get('user-agent') || '');
    const ipHash = rawIp ? hashIp(rawIp) : '';
    const userAgentHash = rawUa ? hashUserAgent(rawUa) : '';

    await AuditLog.create({
      actor: req.session.userId,
      action,
      targetUser: data.targetUser || null,
      targetRole: data.targetRole || null,
      details: data.details || {},
      ipHash,
      userAgentHash,
      // Prefer hashes; raw values are only stored when explicitly enabled.
      ip: storeRawIp ? rawIp : ipHash,
      userAgent: storeRawUserAgent ? rawUa : userAgentHash,
    });
  } catch (e) {
    // Don't fail admin requests on audit errors
    Logger.warn('Audit log write failed', { error: e?.message });
  }
};

// All admin endpoints require at least admin panel access
router.use(requirePermission(PERMISSIONS.ADMIN_ACCESS));

// Get dashboard stats (admin only)
router.get('/stats', requirePermission(PERMISSIONS.SYSTEM_STATS_READ), async (req, res) => {
  try {
    const [
      totalUsers,
      totalPosts,
      totalReplies,
      recentUsers,
      recentPosts,
      topUsers
    ] = await Promise.all([
      User.countDocuments(),
      Post.countDocuments(),
      Post.aggregate([
        { $project: { replyCount: { $size: '$replies' } } },
        { $group: { _id: null, total: { $sum: '$replyCount' } } }
      ]),
      User.find().sort({ createdAt: -1 }).limit(5).select('username email createdAt'),
      Post.find().sort({ createdAt: -1 }).limit(5).populate('author', 'username'),
      User.find().sort({ reputation: -1 }).limit(10).select('username reputation badges')
    ]);

    const stats = {
      overview: {
        totalUsers,
        totalPosts,
        totalReplies: totalReplies[0]?.total || 0,
        averagePostsPerUser: totalUsers > 0 ? (totalPosts / totalUsers).toFixed(2) : 0
      },
      recent: {
        users: recentUsers,
        posts: recentPosts
      },
      topUsers,
      serverInfo: {
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        nodeVersion: process.version,
        platform: process.platform
      }
    };

    Logger.info('Admin accessed dashboard stats', {
      adminId: req.session.userId,
      adminUsername: req.session.username
    });

    await audit(req, 'admin.stats.read');

    res.json(stats);
  } catch (error) {
    Logger.error('Error fetching admin stats', { error: error.message });
    res.status(500).json({ error: 'Error fetching statistics' });
  }
});

// Pin/unpin post (moderator)
router.patch('/posts/:id/pin', requirePermission(PERMISSIONS.POSTS_PIN_ANY), async (req, res) => {
  try {
    const { isPinned } = req.body;
    const post = await Post.findByIdAndUpdate(
      req.params.id,
      { isPinned },
      { new: true }
    ).populate('author', 'username');

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    Logger.info(`Post ${isPinned ? 'pinned' : 'unpinned'}`, {
      postId: post._id,
      moderator: req.session.username
    });

    await audit(req, 'posts.pin', { targetRole: null, details: { postId: String(post._id), isPinned: !!isPinned } });

    res.json(post);
  } catch (error) {
    res.status(500).json({ error: 'Error updating post' });
  }
});

// Delete any post (moderator)
router.delete('/posts/:id', requirePermission(PERMISSIONS.POSTS_DELETE_ANY), async (req, res) => {
  try {
    const post = await Post.findByIdAndDelete(req.params.id);

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    Logger.warn('Post deleted by moderator', {
      postId: post._id,
      postTitle: post.title,
      moderator: req.session.username
    });

    await audit(req, 'posts.delete.any', { details: { postId: String(post._id) } });

    res.json({ message: 'Post deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Error deleting post' });
  }
});

// Update legacy user role (admin-only; kept for backward compatibility)
router.patch('/users/:id/role', requirePermission(PERMISSIONS.USERS_ROLE_ASSIGN), async (req, res) => {
  try {
    const { role } = req.body;

    if (!['member', 'moderator', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    Logger.warn('User role updated', {
      userId: user._id,
      username: user.username,
      newRole: role,
      admin: req.session.username
    });

    await audit(req, 'users.role.legacy.assign', { targetUser: user._id, details: { role } });

    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Error updating user role' });
  }
});

// Get all users (admin only)
router.get('/users', requirePermission(PERMISSIONS.USERS_READ_ANY), async (req, res) => {
  try {
    const { page = 1, limit = 20, search, role } = req.query;
    const query = {};

    if (search) {
      query.$or = [
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    if (role) {
      query.role = role;
    }

    const users = await User.find(query)
      .select('-password')
      .populate('roles', 'name')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const count = await User.countDocuments(query);

    res.json({
      users,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      total: count
    });
  } catch (error) {
    res.status(500).json({ error: 'Error fetching users' });
  }
});

// Replace a user's custom role assignments (multi-role)
router.put('/users/:id/roles', requirePermission(PERMISSIONS.USERS_ROLE_ASSIGN), async (req, res) => {
  try {
    const roleIds = toObjectIdArray(req.body?.roleIds);
    const roles = await Role.find({ _id: { $in: roleIds } }).select('_id name');
    const normalized = roles.map(r => r._id);

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { roles: normalized },
      { new: true }
    )
      .select('-password')
      .populate('roles', 'name');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    await audit(req, 'users.roles.set', {
      targetUser: user._id,
      details: { roleIds: normalized.map(String) },
    });

    return res.json({ user });
  } catch (error) {
    return res.status(500).json({ error: 'Error updating user roles' });
  }
});

// Toggle superadmin (only a superadmin can grant/revoke superadmin)
router.put('/users/:id/superadmin', requirePermission(PERMISSIONS.USERS_SUPERADMIN_ASSIGN), async (req, res) => {
  try {
    if (!req.currentUser?.isSuperAdmin) {
      return res.status(403).json({ error: 'Superadmin access required' });
    }

    const enabled = Boolean(req.body?.enabled);

    // Prevent removing superadmin from yourself via this endpoint.
    if (String(req.params.id) === String(req.session.userId) && enabled === false) {
      return res.status(400).json({ error: 'Cannot remove superadmin from yourself' });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isSuperAdmin: enabled },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    await audit(req, 'users.superadmin.set', {
      targetUser: user._id,
      details: { enabled },
    });

    return res.json({ user });
  } catch (error) {
    return res.status(500).json({ error: 'Error updating superadmin' });
  }
});

// Permission catalog (for admin UI)
router.get('/permissions', requirePermission(PERMISSIONS.PERMISSIONS_READ), async (req, res) => {
  return res.json({
    groups: PERMISSION_GROUPS,
    all: ALL_PERMISSION_NAMES,
  });
});

// Roles CRUD
router.get('/roles', requirePermission(PERMISSIONS.ROLES_READ), async (req, res) => {
  try {
    const roles = await Role.find().sort({ isSystem: -1, name: 1 });
    return res.json({ roles });
  } catch (error) {
    return res.status(500).json({ error: 'Error fetching roles' });
  }
});

router.post('/roles', requirePermission(PERMISSIONS.ROLES_CREATE), async (req, res) => {
  try {
    const name = String(req.body?.name || '').trim();
    const description = String(req.body?.description || '').trim();
    const permissions = Array.isArray(req.body?.permissions) ? req.body.permissions.map(String) : [];

    if (!name) {
      return res.status(400).json({ error: 'Role name is required' });
    }

    const invalid = permissions.filter(p => !ALL_PERMISSION_NAMES.includes(p));
    if (invalid.length) {
      return res.status(400).json({ error: `Invalid permissions: ${invalid.join(', ')}` });
    }

    const role = await Role.create({
      name,
      description,
      permissions: Array.from(new Set(permissions)).sort(),
      isSystem: false,
    });

    await audit(req, 'roles.create', { targetRole: role._id, details: { name } });
    return res.status(201).json({ role });
  } catch (error) {
    if (String(error?.code) === '11000') {
      return res.status(400).json({ error: 'Role name already exists' });
    }
    return res.status(500).json({ error: 'Error creating role' });
  }
});

router.put('/roles/:id', requirePermission(PERMISSIONS.ROLES_UPDATE), async (req, res) => {
  try {
    const role = await Role.findById(req.params.id);
    if (!role) {
      return res.status(404).json({ error: 'Role not found' });
    }

    if (role.isSystem) {
      return res.status(403).json({ error: 'System roles cannot be edited' });
    }

    const name = String(req.body?.name || role.name).trim();
    const description = String(req.body?.description ?? role.description).trim();
    const permissions = Array.isArray(req.body?.permissions) ? req.body.permissions.map(String) : role.permissions;

    const invalid = (permissions || []).filter(p => !ALL_PERMISSION_NAMES.includes(p));
    if (invalid.length) {
      return res.status(400).json({ error: `Invalid permissions: ${invalid.join(', ')}` });
    }

    role.name = name;
    role.description = description;
    role.permissions = Array.from(new Set(permissions || [])).sort();
    await role.save();

    await audit(req, 'roles.update', { targetRole: role._id, details: { name } });
    return res.json({ role });
  } catch (error) {
    if (String(error?.code) === '11000') {
      return res.status(400).json({ error: 'Role name already exists' });
    }
    return res.status(500).json({ error: 'Error updating role' });
  }
});

router.delete('/roles/:id', requirePermission(PERMISSIONS.ROLES_DELETE), async (req, res) => {
  try {
    const role = await Role.findById(req.params.id);
    if (!role) {
      return res.status(404).json({ error: 'Role not found' });
    }

    if (role.isSystem) {
      return res.status(403).json({ error: 'System roles cannot be deleted' });
    }

    const assigned = await User.countDocuments({ roles: role._id });
    if (assigned > 0) {
      return res.status(400).json({ error: 'Role is assigned to users; remove it from users first' });
    }

    await role.deleteOne();
    await audit(req, 'roles.delete', { targetRole: role._id, details: { name: role.name } });
    return res.json({ message: 'Role deleted' });
  } catch (error) {
    return res.status(500).json({ error: 'Error deleting role' });
  }
});

// Award badge to user (admin only)
router.post('/users/:id/badge', requirePermission(PERMISSIONS.BADGES_GRANT_ANY), async (req, res) => {
  try {
    const { name, icon } = req.body;

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    user.badges.push({
      name,
      icon,
      earnedAt: new Date()
    });

    await user.save();

    // Create notification for user
    user.notifications.push({
      type: 'badge',
      message: `You've earned the "${name}" badge! 🎉`,
      link: `/profile.html?user=${user.username}`,
      read: false
    });

    await user.save();

    Logger.info('Badge awarded', {
      userId: user._id,
      username: user.username,
      badge: name,
      admin: req.session.username
    });

    await audit(req, 'badges.grant.any', { targetUser: user._id, details: { name, icon } });

    res.json({ message: 'Badge awarded successfully', user });
  } catch (error) {
    res.status(500).json({ error: 'Error awarding badge' });
  }
});

// Get system logs (admin only)
router.get('/logs', requirePermission(PERMISSIONS.SYSTEM_LOGS_READ), async (req, res) => {
  try {
    const fs = require('fs');
    const path = require('path');
    const { type = 'app', lines = 100 } = req.query;

    const logFile = path.join(__dirname, '..', 'logs', `${type}.log`);

    if (!fs.existsSync(logFile)) {
      return res.status(404).json({ error: 'Log file not found' });
    }

    const content = fs.readFileSync(logFile, 'utf8');
    const logLines = content.split('\n').filter(line => line.trim());
    const recentLogs = logLines.slice(-lines);

    res.json({
      type,
      lines: recentLogs.length,
      logs: recentLogs
    });
  } catch (error) {
    res.status(500).json({ error: 'Error reading logs' });
  }
});

// Audit log viewer (admin only)
router.get('/audit', requirePermission(PERMISSIONS.AUDIT_READ), async (req, res) => {
  try {
    const page = Math.max(1, Number.parseInt(String(req.query?.page || '1'), 10) || 1);
    const limitRaw = Number.parseInt(String(req.query?.limit || '50'), 10) || 50;
    const limit = Math.min(200, Math.max(1, limitRaw));

    const query = {};
    if (req.query?.action) {
      query.action = String(req.query.action).trim();
    }

    const [items, total] = await Promise.all([
      AuditLog.find(query)
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip((page - 1) * limit)
        .populate('actor', 'username email')
        .populate('targetUser', 'username email')
        .populate('targetRole', 'name')
        .lean(),
      AuditLog.countDocuments(query),
    ]);

    await audit(req, 'audit.read', { details: { page, limit, action: query.action || null } });

    return res.json({
      items,
      total,
      totalPages: Math.ceil(total / limit) || 1,
      currentPage: page,
      limit,
    });
  } catch (error) {
    return res.status(500).json({ error: 'Error fetching audit logs' });
  }
});

module.exports = router;
