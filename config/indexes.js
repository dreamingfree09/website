/**
 * config/indexes.js
 *
 * Centralized index creation.
 *
 * This keeps key query paths fast (forum listing/search, portfolios, curated content) and
 * ensures unique constraints are applied even when using Mongo without migrations.
 */
const mongoose = require('mongoose');

// Create indexes for better query performance
async function createIndexes() {
  try {
    const User = require('../models/User');
    const Post = require('../models/Post');
    const ChatRoom = require('../models/ChatRoom');
    const ChatMessage = require('../models/ChatMessage');
    const ChatUpload = require('../models/ChatUpload');
    const Tag = require('../models/Tag');
    const Resource = require('../models/Resource');
    const SiteContent = require('../models/SiteContent');
    const Portfolio = require('../models/Portfolio');
    const AuditLog = require('../models/AuditLog');
    const { StudyWorkspace } = require('../models/StudyWorkspace');
    const StudyFolder = require('../models/StudyFolder');
    const { StudyItem } = require('../models/StudyItem');
    const { StudyTodo } = require('../models/StudyTodo');

    // User indexes
    await User.collection.createIndex({ email: 1 }, { unique: true });
    await User.collection.createIndex({ username: 1 }, { unique: true });
    await User.collection.createIndex({ reputation: -1 });
    await User.collection.createIndex({ createdAt: -1 });
    
    // Post indexes
    await Post.collection.createIndex({ author: 1 });
    await Post.collection.createIndex({ category: 1 });
    await Post.collection.createIndex({ createdAt: -1 });
    await Post.collection.createIndex({ isPinned: -1 });
    await Post.collection.createIndex({ views: -1 });
    
    // Compound indexes for common queries
    await Post.collection.createIndex({ category: 1, createdAt: -1 });
    await Post.collection.createIndex({ author: 1, createdAt: -1 });
    await Post.collection.createIndex({ isPinned: -1, createdAt: -1 });
    
    // Text index for search
    await Post.collection.createIndex({ 
      title: 'text', 
      content: 'text',
      tags: 'text'
    }, {
      weights: {
        title: 10,
        tags: 5,
        content: 1
      }
    });

    // Chat indexes
    // Normalize legacy docs: sparse unique indexes treat "field present with null" as present.
    // Public rooms should not have inviteCode stored at all.
    await ChatRoom.updateMany(
      { isPrivate: false, inviteCode: null },
      { $unset: { inviteCode: '' } }
    );

    await ChatRoom.collection.createIndex({ name: 1 }, { unique: true });
    await ChatRoom.collection.createIndex({ inviteCode: 1 }, { unique: true, sparse: true });
    await ChatRoom.collection.createIndex({ isPrivate: 1, lastActiveAt: -1 });

    // Minimal community defaults
    await ChatRoom.updateOne(
      { name: 'lobby' },
      {
        $set: { isPrivate: false, lastActiveAt: new Date() },
        $setOnInsert: { name: 'lobby', createdAt: new Date() }
      },
      { upsert: true }
    );
    await ChatRoom.updateOne(
      { name: 'help' },
      {
        $set: { isPrivate: false, lastActiveAt: new Date() },
        $setOnInsert: { name: 'help', createdAt: new Date() }
      },
      { upsert: true }
    );

    await ChatMessage.collection.createIndex({ room: 1, createdAt: -1 });
    // TTL: delete when expiresAt < now (0 seconds after)
    // Make this idempotent even if an older, non-TTL expiresAt index exists.
    try {
      const existingIndexes = await ChatMessage.collection.indexes();
      const expiresAtIndex = existingIndexes.find((idx) => idx?.key?.expiresAt === 1);

      if (expiresAtIndex && expiresAtIndex.expireAfterSeconds !== 0) {
        await ChatMessage.collection.dropIndex(expiresAtIndex.name);
      }

      // Create (or ensure) TTL index
      await ChatMessage.collection.createIndex(
        { expiresAt: 1 },
        { expireAfterSeconds: 0 }
      );
    } catch (ttlError) {
      console.error('Error creating chat TTL index:', ttlError.message);
    }

    // Chat upload indexes
    await ChatUpload.collection.createIndex({ room: 1, createdAt: -1 });

    // Curated tags/resources indexes
    await Tag.collection.createIndex({ slug: 1 }, { unique: true });
    await Tag.collection.createIndex({ category: 1, name: 1 });
    await Tag.collection.createIndex({ isActive: 1 });

    await Resource.collection.createIndex({ key: 1 }, { unique: true });
    await Resource.collection.createIndex({ tags: 1, createdAt: -1 });
    await Resource.collection.createIndex({ kind: 1, createdAt: -1 });
    await Resource.collection.createIndex({ isActive: 1, createdAt: -1 });

    // Text index for resource search
    await Resource.collection.createIndex({
      title: 'text',
      description: 'text',
      tags: 'text',
      url: 'text',
      fileOriginalName: 'text'
    }, {
      weights: {
        title: 10,
        tags: 5,
        description: 2,
        url: 1,
        fileOriginalName: 1
      }
    });

    // Site content indexes
    await SiteContent.collection.createIndex({ slug: 1 }, { unique: true });

    // User portfolio indexes
    await Portfolio.collection.createIndex({ owner: 1 }, { unique: true });
    await Portfolio.collection.createIndex({ isPublic: 1, updatedAt: -1 });

    // Audit log indexes + retention
    await AuditLog.collection.createIndex({ actor: 1, createdAt: -1 });
    await AuditLog.collection.createIndex({ action: 1, createdAt: -1 });
    await AuditLog.collection.createIndex({ targetUser: 1, createdAt: -1 });

    const retentionDaysRaw = Number.parseInt(process.env.AUDIT_RETENTION_DAYS || '90', 10);
    const retentionDays = Number.isFinite(retentionDaysRaw) ? retentionDaysRaw : 90;
    const expireAfterSeconds = retentionDays > 0 ? retentionDays * 24 * 60 * 60 : 0;

    try {
      const existingIndexes = await AuditLog.collection.indexes();
      const createdAtIndex = existingIndexes.find((idx) => idx?.key?.createdAt === 1);

      // If we want TTL, ensure the createdAt index is TTL with the requested value.
      if (retentionDays > 0) {
        if (createdAtIndex && createdAtIndex.expireAfterSeconds !== expireAfterSeconds) {
          await AuditLog.collection.dropIndex(createdAtIndex.name);
        }

        await AuditLog.collection.createIndex(
          { createdAt: 1 },
          { expireAfterSeconds }
        );
      } else {
        // If retention disabled, drop any TTL index on createdAt (if present).
        if (createdAtIndex && typeof createdAtIndex.expireAfterSeconds === 'number') {
          await AuditLog.collection.dropIndex(createdAtIndex.name);
        }
      }
    } catch (ttlError) {
      console.error('Error creating audit TTL index:', ttlError.message);
    }

    // TTL: delete chat upload metadata when expiresAt < now.
    // Disk cleanup is handled by utils/chatUploadsCleanup.js.
    try {
      const existingIndexes = await ChatUpload.collection.indexes();
      const expiresAtIndex = existingIndexes.find((idx) => idx?.key?.expiresAt === 1);

      if (expiresAtIndex && expiresAtIndex.expireAfterSeconds !== 0) {
        await ChatUpload.collection.dropIndex(expiresAtIndex.name);
      }

      await ChatUpload.collection.createIndex(
        { expiresAt: 1 },
        { expireAfterSeconds: 0 }
      );
    } catch (ttlError) {
      console.error('Error creating chat upload TTL index:', ttlError.message);
    }

    // Study Room indexes
    await StudyWorkspace.collection.createIndex({ owner: 1, updatedAt: -1 });
    await StudyFolder.collection.createIndex({ owner: 1, workspace: 1, sortOrder: 1, createdAt: 1 });
    await StudyFolder.collection.createIndex({ workspace: 1, name: 1 }, { unique: true });

    await StudyItem.collection.createIndex({ owner: 1, workspace: 1, status: 1, pinned: -1, updatedAt: -1 });
    await StudyItem.collection.createIndex({ workspace: 1, folder: 1, sortOrder: 1, createdAt: 1 });

    await StudyTodo.collection.createIndex({ owner: 1, workspace: 1, done: 1, dueAt: 1, createdAt: -1 });
    await StudyTodo.collection.createIndex({ workspace: 1, item: 1, createdAt: -1 });

    console.log('Database indexes created successfully');
  } catch (error) {
    console.error('Error creating indexes:', error.message);
  }
}

module.exports = createIndexes;
