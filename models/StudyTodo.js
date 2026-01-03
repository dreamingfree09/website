/**
 * models/StudyTodo.js
 *
 * To-do items for a StudyWorkspace (global) or attached to a StudyItem.
 */
const mongoose = require('mongoose');

const STUDY_TODO_KIND = ['task', 'flashcards', 'practice', 'project', 'quiz'];

const studyTodoSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    workspace: { type: mongoose.Schema.Types.ObjectId, ref: 'StudyWorkspace', required: true, index: true },
    item: { type: mongoose.Schema.Types.ObjectId, ref: 'StudyItem', default: null, index: true },

    text: { type: String, required: true, trim: true, maxlength: 240 },
    kind: { type: String, enum: STUDY_TODO_KIND, default: 'task', index: true },
    done: { type: Boolean, default: false, index: true },
    dueAt: { type: Date, default: null, index: true },
    priority: { type: String, enum: ['low', 'normal', 'high'], default: 'normal', index: true },

    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

studyTodoSchema.index({ owner: 1, workspace: 1, done: 1, dueAt: 1, createdAt: -1 });
studyTodoSchema.index({ workspace: 1, item: 1, createdAt: -1 });

module.exports = {
  StudyTodo: mongoose.model('StudyTodo', studyTodoSchema),
  STUDY_TODO_KIND,
};
