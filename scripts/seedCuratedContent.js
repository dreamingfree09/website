/*
  scripts/seedCuratedContent.js

  Seeds the curated Tags + Resources dataset into MongoDB.

  Usage:
    - npm run seed:curated

  Notes:
    - Idempotent: uses upserts; safe to run multiple times.
    - Uses MONGODB_URI if set, otherwise defaults to localhost piqniq DB.
*/

const mongoose = require('mongoose');
const { seedCuratedContent } = require('../utils/seedCuratedContent');

async function main() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/piqniq';

  await mongoose.connect(uri);

  const res = await seedCuratedContent();
  const createdTags = (res?.tags || []).filter((t) => t.created).length;
  const createdResources = (res?.resources || []).filter((r) => r.created).length;

  // Recount using the same models used by the app.
  const Tag = require('../models/Tag');
  const Resource = require('../models/Resource');
  const tagCount = await Tag.countDocuments();
  const resourceCount = await Resource.countDocuments();

  // Keep output simple and script-friendly.
  // (Avoid printing credentials; only print the sanitized URI)
  const safeUri = String(uri).replace(/:\/\/(.*@)/, '://');

  console.log(JSON.stringify({
    ok: true,
    mongoUri: safeUri,
    createdTags,
    createdResources,
    tagCount,
    resourceCount,
  }));

  await mongoose.connection.close();
}

main().catch(async (err) => {
  try {
    await mongoose.connection.close();
  } catch {}
  console.error(err);
  process.exit(1);
});
