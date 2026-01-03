/**
 * models/StudyWorkspace.js
 *
 * A user's personal "Study Room" workspace. Users can create multiple workspaces
 * (e.g. "Frontend", "AWS", "DSA") and organize study items + todos within them.
 */
const mongoose = require('mongoose');

const STUDY_WORKSPACE_MODES = ['build', 'revise', 'interview'];

const dailyKeyUtc = () => {
  // Store a stable YYYY-MM-DD key in UTC to avoid timezone drift.
  const d = new Date();
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const studyWorkspaceSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    title: { type: String, required: true, trim: true, maxlength: 80 },
    goal: { type: String, default: '', trim: true, maxlength: 300 },

    // Optional lightweight personalization.
    emoji: { type: String, default: '', trim: true, maxlength: 10 },

    // Learning mode influences defaults (UI) and helps users stay intentional.
    mode: { type: String, enum: STUDY_WORKSPACE_MODES, default: 'build', index: true },

    // "Next 3" focus list for today.
    focusDateKey: { type: String, default: dailyKeyUtc, trim: true, maxlength: 10 },
    focus: {
      type: [
        {
          kind: { type: String, enum: ['item', 'todo'], required: true },
          refId: { type: mongoose.Schema.Types.ObjectId, required: true },
          addedAt: { type: Date, default: Date.now },
        }
      ],
      default: [],
      validate: {
        validator: (arr) => Array.isArray(arr) && arr.length <= 3,
        message: 'Focus list cannot exceed 3 items',
      },
    },

    // Lightweight gamified stats (opt-in in UI, but safe to compute regardless).
    xp: { type: Number, default: 0, min: 0 },
    level: { type: Number, default: 1, min: 1 },
    streakCount: { type: Number, default: 0, min: 0 },
    lastActivityDateKey: { type: String, default: '', trim: true, maxlength: 10 },
  },
  { timestamps: true }
);

studyWorkspaceSchema.index({ owner: 1, updatedAt: -1 });
studyWorkspaceSchema.index({ owner: 1, mode: 1, updatedAt: -1 });

module.exports = {
  StudyWorkspace: mongoose.model('StudyWorkspace', studyWorkspaceSchema),
  STUDY_WORKSPACE_MODES,
  dailyKeyUtc,
};
