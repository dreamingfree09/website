/**
 * models/StudyFolder.js
 *
 * Optional folder/grouping inside a StudyWorkspace.
 */
const mongoose = require('mongoose');

const studyFolderSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    workspace: { type: mongoose.Schema.Types.ObjectId, ref: 'StudyWorkspace', required: true, index: true },

    name: { type: String, required: true, trim: true, maxlength: 60 },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

studyFolderSchema.index({ owner: 1, workspace: 1, sortOrder: 1, createdAt: 1 });
studyFolderSchema.index({ workspace: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('StudyFolder', studyFolderSchema);
