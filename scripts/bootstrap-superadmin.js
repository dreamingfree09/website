/**
 * scripts/bootstrap-superadmin.js
 *
 * One-time bootstrap helper to create a Super Admin user in the database.
 *
 * Usage (PowerShell):
 *   node scripts/bootstrap-superadmin.js --email you@example.com --username yourname --password "YourStrongPassword123!"
 *
 * Or via env vars:
 *   $env:ADMIN_EMAIL='you@example.com'
 *   $env:ADMIN_USERNAME='yourname'
 *   $env:ADMIN_PASSWORD='YourStrongPassword123!'
 *   node scripts/bootstrap-superadmin.js
 */

require('dotenv').config();

const mongoose = require('mongoose');
const User = require('../models/User');
const Role = require('../models/Role');
const { seedSystemRoles } = require('../utils/seedSystemRoles');

const readPasswordFromStdin = async (promptText) => {
  return new Promise((resolve) => {
    const stdin = process.stdin;
    const stdout = process.stdout;

    if (!stdin.isTTY) {
      resolve('');
      return;
    }

    stdout.write(promptText);

    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');

    let password = '';

    const onData = (ch) => {
      // Enter
      if (ch === '\r' || ch === '\n') {
        stdout.write('\n');
        stdin.setRawMode(false);
        stdin.pause();
        stdin.removeListener('data', onData);
        resolve(password);
        return;
      }

      // Ctrl+C
      if (ch === '\u0003') {
        stdout.write('\nAborted.\n');
        process.exit(1);
      }

      // Backspace
      if (ch === '\u0008' || ch === '\u007f') {
        if (password.length > 0) {
          password = password.slice(0, -1);
          stdout.write('\b \b');
        }
        return;
      }

      // Ignore other control chars
      if (ch < ' ' || ch === '\u007f') return;

      password += ch;
      stdout.write('*');
    };

    stdin.on('data', onData);
  });
};

const parseArgs = () => {
  const args = process.argv.slice(2);
  const out = {};
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--email') out.email = args[++i];
    else if (a === '--username') out.username = args[++i];
    else if (a === '--password') out.password = args[++i];
  }
  return out;
};

const main = async () => {
  const cli = parseArgs();

  const nodeEnv = String(process.env.NODE_ENV || 'development').trim().toLowerCase();
  if (nodeEnv === 'production') {
    const confirmed = String(process.env.CONFIRM_PRODUCTION_BOOTSTRAP || '').trim().toLowerCase() === 'true';
    if (!confirmed) {
      console.error('Refusing to run in production without CONFIRM_PRODUCTION_BOOTSTRAP=true.');
      console.error('Set CONFIRM_PRODUCTION_BOOTSTRAP=true only when you are intentionally bootstrapping an owner account.');
      process.exit(1);
    }
  }

  const email = String(cli.email || process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const username = String(cli.username || process.env.ADMIN_USERNAME || '').trim();
  let password = String(cli.password || process.env.ADMIN_PASSWORD || '').trim();

  if (!email || !username) {
    console.error('Missing required values. Provide --email and --username (or ADMIN_EMAIL/ADMIN_USERNAME env vars).');
    process.exit(1);
  }

  if (!password) {
    password = String(await readPasswordFromStdin('Enter superadmin password (input hidden): ')).trim();
  }

  if (!password) {
    console.error('Missing password. Provide --password / ADMIN_PASSWORD, or enter it interactively.');
    process.exit(1);
  }

  if (password.includes('CHOOSE_A_STRONG_PASSWORD_HERE')) {
    console.error('Refusing to run: your password still contains the placeholder text. Replace it with your real password and wrap it in quotes.');
    process.exit(1);
  }

  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/piqniq';

  await mongoose.connect(mongoUri);

  // Ensure system roles exist (idempotent)
  await seedSystemRoles();

  const adminRole = await Role.findOne({ name: 'Admin' }).select('_id');

  let user = await User.findOne({ email });

  if (!user) {
    user = await User.create({
      email,
      username,
      password,
      isEmailVerified: true,
      emailVerificationToken: undefined,
      emailVerificationExpires: undefined,
      role: 'admin',
      roles: adminRole ? [adminRole._id] : [],
      isSuperAdmin: true,
    });

    console.log(`Created superadmin user: ${user.email} (${user.username})`);
  } else {
    user.username = user.username || username;
    user.isEmailVerified = true;
    user.role = user.role || 'admin';
    user.isSuperAdmin = true;

    if (adminRole) {
      const current = Array.isArray(user.roles) ? user.roles.map(String) : [];
      const adminId = String(adminRole._id);
      if (!current.includes(adminId)) {
        user.roles = [...(user.roles || []), adminRole._id];
      }
    }

    // Only reset password if it's explicitly provided (it is required for this script).
    user.password = password;

    await user.save();
    console.log(`Updated existing user to superadmin: ${user.email} (${user.username})`);
  }

  console.log('Done. You can now sign in with your email OR username + password.');

  await mongoose.disconnect();
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
