const fs = require('fs');
const path = require('path');

const { Logger } = require('./logger');

let started = false;

function startChatUploadsCleanup({ uploadsDir, intervalMs = 60 * 60 * 1000 } = {}) {
  if (started) return;
  started = true;

  const ChatUpload = require('../models/ChatUpload');

  const dir = uploadsDir || path.join(__dirname, '..', 'uploads', 'chat');

  const ensureDir = () => {
    try {
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    } catch (error) {
      Logger.error('Chat upload cleanup: failed to ensure dir', { error: error?.message });
    }
  };

  const cleanupExpiredDocs = async () => {
    try {
      const now = new Date();
      const expired = await ChatUpload.find({ expiresAt: { $lt: now } })
        .select('_id storedName')
        .limit(500);

      for (const doc of expired) {
        const filePath = path.join(dir, doc.storedName);
        try {
          if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        } catch {
          // ignore file delete failures
        }
        try {
          await ChatUpload.deleteOne({ _id: doc._id });
        } catch {
          // ignore
        }
      }

      if (expired.length) {
        Logger.info('Chat upload cleanup: removed expired', { count: expired.length });
      }
    } catch (error) {
      Logger.error('Chat upload cleanup: expired cleanup failed', { error: error?.message });
    }
  };

  const cleanupOrphanFiles = async () => {
    try {
      ensureDir();
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      const files = entries.filter((e) => e.isFile()).map((e) => e.name);
      if (!files.length) return;

      const chunkSize = 200;
      for (let i = 0; i < files.length; i += chunkSize) {
        const chunk = files.slice(i, i + chunkSize);
        const docs = await ChatUpload.find({ storedName: { $in: chunk } }).select('storedName').lean();
        const present = new Set(docs.map((d) => d.storedName));

        for (const name of chunk) {
          if (present.has(name)) continue;

          const filePath = path.join(dir, name);
          try {
            const stat = fs.statSync(filePath);
            // Be conservative: only delete if file is not referenced and is older than 1 hour.
            if (Date.now() - stat.mtimeMs < 60 * 60 * 1000) continue;
            fs.unlinkSync(filePath);
          } catch {
            // ignore
          }
        }
      }
    } catch (error) {
      Logger.error('Chat upload cleanup: orphan cleanup failed', { error: error?.message });
    }
  };

  const tick = async () => {
    await cleanupExpiredDocs();
    await cleanupOrphanFiles();
  };

  // Fire once shortly after startup, then on an interval.
  setTimeout(() => {
    tick().catch(() => {});
  }, 15 * 1000);

  setInterval(() => {
    tick().catch(() => {});
  }, intervalMs);

  Logger.info('Chat upload cleanup started', { uploadsDir: dir, intervalMs });
}

module.exports = { startChatUploadsCleanup };
