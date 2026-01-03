/**
 * scripts/seed-rbac-test-users.js
 *
 * Dev helper: creates non-superadmin users for validating RBAC behavior.
 *
 * It creates/updates two accounts:
 * - rbac_content: assigned the system "Content" role (admin panel access + content curation)
 * - rbac_denied: no roles (useful to confirm 401/403 behavior)
 *
 * Usage (PowerShell):
 *   node scripts/seed-rbac-test-users.js
 *
 * Optional (set a known password for both accounts):
 *   node scripts/seed-rbac-test-users.js --password "YourPassword123!"
 *
 * Or via env vars:
 *   $env:RBAC_TEST_PASSWORD='YourPassword123!'
 *   node scripts/seed-rbac-test-users.js
 */

require('dotenv').config();

const crypto = require('crypto');
const mongoose = require('mongoose');

const User = require('../models/User');
const Role = require('../models/Role');
const { seedSystemRoles } = require('../utils/seedSystemRoles');

const parseArgs = () => {
  const args = process.argv.slice(2);
  const out = {};
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--password') out.password = args[++i];
  }
  return out;
};

const generatePassword = () => {
  // 24 chars, URL-safe-ish, no ambiguous punctuation.
  return crypto.randomBytes(18).toString('base64url');
};

const upsertUser = async ({ email, username, roleIds, password }) => {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const normalizedUsername = String(username || '').trim();

  if (!normalizedEmail || !normalizedUsername) {
    throw new Error('Missing email/username for seed user');
  }

  let user = await User.findOne({ email: normalizedEmail });

  if (!user) {
    user = await User.create({
      email: normalizedEmail,
      username: normalizedUsername,
      password,
      isEmailVerified: true,
      role: 'member',
      roles: roleIds,
      isSuperAdmin: false,
    });

    return { created: true, user };
  }

  user.username = user.username || normalizedUsername;
  user.isEmailVerified = true;
  user.isSuperAdmin = false;
  user.role = user.role || 'member';

  if (Array.isArray(roleIds)) {
    user.roles = roleIds;
  }

  // Only reset password if a password was explicitly provided.
  if (password) {
    user.password = password;
  }

  await user.save();

  return { created: false, user };
};

const main = async () => {
  const cli = parseArgs();
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/piqniq';

  const explicitPassword = String(cli.password || process.env.RBAC_TEST_PASSWORD || '').trim();
  const shouldResetPassword = Boolean(explicitPassword);

  await mongoose.connect(mongoUri);

  // Ensure system roles exist (idempotent)
  await seedSystemRoles();

  const contentRole = await Role.findOne({ name: 'Content', isSystem: true }).select('_id name').lean();
  const contentRoleIds = contentRole ? [contentRole._id] : [];

  const contentPassword = shouldResetPassword ? explicitPassword : null;
  const deniedPassword = shouldResetPassword ? explicitPassword : null;

  // If no password was provided, only generate passwords for *new* users.
  const generated = {
    rbac_content: null,
    rbac_denied: null,
  };

  const ensurePassword = async (email) => {
    if (shouldResetPassword) return explicitPassword;
    const existing = await User.findOne({ email: String(email).trim().toLowerCase() }).select('_id').lean();
    if (existing) return null;
    return generatePassword();
  };

  const contentPw = contentPassword ?? (await ensurePassword('rbac_content@example.com'));
  const deniedPw = deniedPassword ?? (await ensurePassword('rbac_denied@example.com'));

  if (contentPw && !shouldResetPassword) generated.rbac_content = contentPw;
  if (deniedPw && !shouldResetPassword) generated.rbac_denied = deniedPw;

  const contentResult = await upsertUser({
    email: 'rbac_content@example.com',
    username: 'rbac_content',
    roleIds: contentRoleIds,
    password: contentPw,
  });

  const deniedResult = await upsertUser({
    email: 'rbac_denied@example.com',
    username: 'rbac_denied',
    roleIds: [],
    password: deniedPw,
  });

  const contentUser = await User.findById(contentResult.user._id)
    .select('email username role roles isSuperAdmin isEmailVerified')
    .populate('roles', 'name')
    .lean();

  const deniedUser = await User.findById(deniedResult.user._id)
    .select('email username role roles isSuperAdmin isEmailVerified')
    .populate('roles', 'name')
    .lean();

  console.log('Seeded RBAC test users.');
  console.log(JSON.stringify({
    mongoUri,
    roles: {
      contentRoleFound: Boolean(contentRole),
      contentRoleName: contentRole?.name || null,
    },
    users: {
      rbac_content: {
        created: contentResult.created,
        email: contentUser?.email,
        username: contentUser?.username,
        legacyRole: contentUser?.role,
        customRoles: (contentUser?.roles || []).map(r => r?.name).filter(Boolean),
        isSuperAdmin: Boolean(contentUser?.isSuperAdmin),
        isEmailVerified: Boolean(contentUser?.isEmailVerified),
        password: shouldResetPassword ? '(set via --password / RBAC_TEST_PASSWORD)' : (generated.rbac_content ? '(generated; see below)' : '(unchanged)'),
      },
      rbac_denied: {
        created: deniedResult.created,
        email: deniedUser?.email,
        username: deniedUser?.username,
        legacyRole: deniedUser?.role,
        customRoles: (deniedUser?.roles || []).map(r => r?.name).filter(Boolean),
        isSuperAdmin: Boolean(deniedUser?.isSuperAdmin),
        isEmailVerified: Boolean(deniedUser?.isEmailVerified),
        password: shouldResetPassword ? '(set via --password / RBAC_TEST_PASSWORD)' : (generated.rbac_denied ? '(generated; see below)' : '(unchanged)'),
      },
    },
  }, null, 2));

  if (!shouldResetPassword) {
    if (generated.rbac_content || generated.rbac_denied) {
      console.log('\nGenerated passwords (save these now):');
      if (generated.rbac_content) console.log(`- rbac_content: ${generated.rbac_content}`);
      if (generated.rbac_denied) console.log(`- rbac_denied: ${generated.rbac_denied}`);
      console.log('\nRe-run with --password (or RBAC_TEST_PASSWORD) to set a known password later.');
    } else {
      console.log('\nPasswords were not changed (users already existed and no password was provided).');
      console.log('Provide --password (or RBAC_TEST_PASSWORD) if you want to reset them.');
    }
  }

  console.log('\nSuggested manual checks:');
  console.log('- Sign in as rbac_denied and try /admin (should be denied).');
  console.log('- Sign in as rbac_content and try /admin (should load).');
  console.log('  - Should be able to manage Pathways + Resources (Content role).');
  console.log('  - Should NOT be able to manage Users/Roles/Audit/Logs (should get 403).');

  await mongoose.disconnect();
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
