/**
 * routes/documents.js
 *
 * Authenticated document upload + management for share-card downloads.
 *
 * Security:
 * - Strict allowlist (extensions + MIME)
 * - 25MB size limit
 * - Stores outside public web root
 * - Sanitizes filenames and never trusts client paths
 */
const express = require('express');
const multer = require('multer');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

const { isAuthenticated } = require('../middleware/auth');
const { Logger } = require('../utils/logger');
const Document = require('../models/Document');

const router = express.Router();

const MAX_DOCUMENT_BYTES = 25 * 1024 * 1024;
const DOCUMENTS_DIR = path.join(__dirname, '..', 'uploads', 'documents');

const ALLOWED_EXTENSIONS = new Set([
  'pdf', 'doc', 'docx', 'rtf', 'txt', 'md',
  'xls', 'xlsx', 'csv',
  'ppt', 'pptx',
  'png', 'jpg', 'jpeg', 'webp',
  'zip'
]);

// Broad allowlist by MIME. (We still check extension, and optionally sniff magic bytes for common formats.)
const ALLOWED_MIME = new Set([
  // documents
  'application/pdf',
  'text/plain',
  'text/markdown',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/rtf',
  'text/rtf',

  // spreadsheets
  'text/csv',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',

  // presentations
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',

  // images
  'image/png',
  'image/jpeg',
  'image/webp',

  // archives
  'application/zip',
  'application/x-zip-compressed',
]);

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function safeBasename(name) {
  const base = path.basename(String(name || '')).trim();
  return base.replace(/[^a-zA-Z0-9._ -]/g, '_').slice(0, 160) || 'file';
}

function getExtensionFromName(name) {
  const ext = path.extname(String(name || '')).toLowerCase().replace('.', '');
  return ext.slice(0, 16);
}

function sha256Hex(input) {
  return crypto.createHash('sha256').update(String(input)).digest('hex');
}

function readHeaderBytes(filePath, max = 32) {
  const fd = fs.openSync(filePath, 'r');
  try {
    const buffer = Buffer.alloc(max);
    const bytesRead = fs.readSync(fd, buffer, 0, max, 0);
    return buffer.slice(0, bytesRead);
  } finally {
    fs.closeSync(fd);
  }
}

function looksLikePdf(header) {
  return header && header.length >= 4 && header.slice(0, 4).toString('utf8') === '%PDF';
}

function looksLikeZip(header) {
  // ZIP files start with PK\x03\x04 (or variations). Also used by docx/xlsx/pptx.
  return header && header.length >= 2 && header[0] === 0x50 && header[1] === 0x4b;
}

function looksLikePng(header) {
  if (!header || header.length < 8) return false;
  return header[0] === 0x89 && header[1] === 0x50 && header[2] === 0x4e && header[3] === 0x47;
}

function looksLikeJpeg(header) {
  if (!header || header.length < 3) return false;
  return header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff;
}

function looksLikeWebp(header) {
  if (!header || header.length < 12) return false;
  return header.slice(0, 4).toString('ascii') === 'RIFF' && header.slice(8, 12).toString('ascii') === 'WEBP';
}

function magicBytesOk(filePath, extension) {
  // Only enforce sniffing for formats with simple signatures.
  // For other formats, we rely on extension+MIME allowlist.
  const header = readHeaderBytes(filePath, 32);

  if (extension === 'pdf') return looksLikePdf(header);
  if (extension === 'png') return looksLikePng(header);
  if (extension === 'jpg' || extension === 'jpeg') return looksLikeJpeg(header);
  if (extension === 'webp') return looksLikeWebp(header);

  if (extension === 'zip') return looksLikeZip(header);
  if (extension === 'docx' || extension === 'xlsx' || extension === 'pptx') return looksLikeZip(header);

  return true;
}

ensureDir(DOCUMENTS_DIR);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, DOCUMENTS_DIR);
  },
  filename: (req, file, cb) => {
    const token = crypto.randomBytes(18).toString('base64url');
    const ext = getExtensionFromName(file.originalname);
    const safeExt = ext ? `.${ext}` : '';
    cb(null, `${token}${safeExt}`);
  }
});

const uploadDocument = multer({
  storage,
  limits: { fileSize: MAX_DOCUMENT_BYTES },
  fileFilter: (req, file, cb) => {
    const ext = getExtensionFromName(file.originalname);
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      cb(new Error('File type not allowed'));
      return;
    }

    const mime = String(file.mimetype || '').toLowerCase();
    if (mime && !ALLOWED_MIME.has(mime)) {
      cb(new Error('File type not allowed'));
      return;
    }

    cb(null, true);
  }
});

// GET /api/documents
router.get('/', isAuthenticated, async (req, res) => {
  try {
    const ownerId = req.session.userId;
    const docs = await Document.find({ owner: ownerId, deletedAt: null })
      .select('_id type label originalName mimeType extension sizeBytes createdAt')
      .sort({ createdAt: -1 })
      .lean();

    res.json({ items: docs || [] });
  } catch (error) {
    Logger.error('List documents failed', { error: error?.message });
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/documents  (multipart: file + type + label)
router.post('/', isAuthenticated, uploadDocument.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const ownerId = req.session.userId;

    const originalName = safeBasename(req.file.originalname);
    const extension = getExtensionFromName(originalName);

    if (!magicBytesOk(req.file.path, extension)) {
      try { fs.unlinkSync(req.file.path); } catch { /* ignore */ }
      return res.status(400).json({ error: 'File content did not match its type' });
    }

    const type = String(req.body?.type || 'Other').trim();
    const label = String(req.body?.label || '').trim().slice(0, 120);

    const doc = await Document.create({
      owner: ownerId,
      type: ['CV', 'CoverLetter', 'Certificate', 'Transcript', 'Other'].includes(type) ? type : 'Other',
      label,
      originalName,
      storedName: req.file.filename,
      extension,
      mimeType: String(req.file.mimetype || '').toLowerCase(),
      sizeBytes: Number(req.file.size || 0),
    });

    Logger.info('Document uploaded', {
      userId: ownerId,
      documentId: String(doc._id),
      sizeBytes: doc.sizeBytes,
      mimeType: doc.mimeType,
    });

    res.status(201).json({
      document: {
        id: doc._id.toString(),
        type: doc.type,
        label: doc.label,
        originalName: doc.originalName,
        mimeType: doc.mimeType,
        extension: doc.extension,
        sizeBytes: doc.sizeBytes,
        createdAt: doc.createdAt,
      }
    });
  } catch (error) {
    Logger.error('Document upload failed', { error: error?.message });
    res.status(500).json({ error: 'Failed to upload document' });
  }
});

// DELETE /api/documents/:id
router.delete('/:id', isAuthenticated, async (req, res) => {
  try {
    const ownerId = req.session.userId;
    const id = String(req.params.id || '').trim();

    const doc = await Document.findOne({ _id: id, owner: ownerId, deletedAt: null });
    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }

    doc.deletedAt = new Date();
    await doc.save();

    // Best-effort remove file from disk.
    const fullPath = path.join(DOCUMENTS_DIR, doc.storedName);
    try {
      if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
    } catch {
      // ignore
    }

    Logger.info('Document deleted', { userId: ownerId, documentId: id });
    res.json({ message: 'Deleted' });
  } catch (error) {
    Logger.error('Delete document failed', { error: error?.message });
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/documents/:id/download
router.get('/:id/download', isAuthenticated, async (req, res) => {
  try {
    const ownerId = req.session.userId;
    const id = String(req.params.id || '').trim();

    const doc = await Document.findOne({ _id: id, owner: ownerId, deletedAt: null })
      .select('originalName storedName mimeType')
      .lean();

    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const filePath = path.join(DOCUMENTS_DIR, doc.storedName);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File missing from server' });
    }

    res.setHeader('Content-Type', doc.mimeType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${safeBasename(doc.originalName)}"`);
    fs.createReadStream(filePath).pipe(res);
  } catch (error) {
    Logger.error('Download document failed', { error: error?.message });
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
module.exports.DOCUMENTS_DIR = DOCUMENTS_DIR;
module.exports.ALLOWED_EXTENSIONS = Array.from(ALLOWED_EXTENSIONS);
module.exports.MAX_DOCUMENT_BYTES = MAX_DOCUMENT_BYTES;
