/**
 * models/StudyItem.js
 *
 * Items saved to a StudyWorkspace.
 *
 * Items reference existing platform objects when possible (Resource/Document)
 * to avoid copying and to keep data minimal.
 */
const mongoose = require('mongoose');

const STUDY_ITEM_TYPES = ['resource', 'document', 'link', 'note'];
const STUDY_ITEM_STATUS = ['saved', 'active', 'completed', 'archived'];
const STUDY_ITEM_MASTERY = ['none', 'understand', 'implement', 'teach'];

const studyItemSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    workspace: { type: mongoose.Schema.Types.ObjectId, ref: 'StudyWorkspace', required: true, index: true },
    folder: { type: mongoose.Schema.Types.ObjectId, ref: 'StudyFolder', default: null, index: true },

    type: { type: String, enum: STUDY_ITEM_TYPES, required: true, index: true },

    resource: { type: mongoose.Schema.Types.ObjectId, ref: 'Resource', default: null, index: true },
    document: { type: mongoose.Schema.Types.ObjectId, ref: 'Document', default: null, index: true },

    // For links and notes (and optional overrides for referenced items)
    title: { type: String, default: '', trim: true, maxlength: 160 },
    url: { type: String, default: '', trim: true, maxlength: 1200 },
    note: { type: String, default: '', trim: true, maxlength: 8000 },

    tags: {
      type: [String],
      default: [],
      validate: {
        validator: (arr) => Array.isArray(arr) && arr.length <= 20,
        message: 'Too many tags',
      },
    },

    status: { type: String, enum: STUDY_ITEM_STATUS, default: 'saved', index: true },
    progressPercent: { type: Number, default: 0, min: 0, max: 100 },
    pinned: { type: Boolean, default: false, index: true },

    // Evidence-based learning progress.
    mastery: { type: String, enum: STUDY_ITEM_MASTERY, default: 'none', index: true },

    // Spaced repetition (optional).
    reviewEnabled: { type: Boolean, default: false, index: true },
    reviewStage: { type: Number, default: 0, min: 0, max: 10 },
    nextReviewAt: { type: Date, default: null, index: true },
    lastReviewedAt: { type: Date, default: null, index: true },

    lastTouchedAt: { type: Date, default: null, index: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

studyItemSchema.index({ owner: 1, workspace: 1, status: 1, pinned: -1, updatedAt: -1 });
studyItemSchema.index({ workspace: 1, folder: 1, sortOrder: 1, createdAt: 1 });
studyItemSchema.index({ owner: 1, workspace: 1, reviewEnabled: 1, nextReviewAt: 1 });

studyItemSchema.pre('validate', function validateStudyItem(next) {
  try {
    const type = String(this.type || '').toLowerCase();

    if (type === 'resource') {
      if (!this.resource) return next(new Error('resourceId is required for resource items'));
      this.document = null;
      this.url = '';
    }

    if (type === 'document') {
      if (!this.document) return next(new Error('documentId is required for document items'));
      this.resource = null;
      this.url = '';
    }

    if (type === 'link') {
      const url = String(this.url || '').trim();
      if (!url) return next(new Error('url is required for link items'));
      if (!/^https?:\/\//i.test(url)) return next(new Error('url must start with http:// or https://'));
      this.resource = null;
      this.document = null;
    }

    if (type === 'note') {
      const note = String(this.note || '').trim();
      if (!note) return next(new Error('note is required for note items'));
      this.resource = null;
      this.document = null;
      this.url = '';
    }

    if (this.status === 'completed' && (this.progressPercent || 0) < 100) {
      this.progressPercent = 100;
    }

    if ((this.progressPercent || 0) >= 100 && this.status !== 'archived') {
      // Don't force status; just keep progress consistent.
      this.progressPercent = 100;
    }

    return next();
  } catch (e) {
    return next(e);
  }
});

module.exports = {
  StudyItem: mongoose.model('StudyItem', studyItemSchema),
  STUDY_ITEM_TYPES,
  STUDY_ITEM_STATUS,
  STUDY_ITEM_MASTERY,
};
