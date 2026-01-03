/**
 * config/database.js
 *
 * MongoDB connection helper.
 *
 * Uses a short server selection timeout so the server can fail fast when Mongo is unavailable.
 * Logs a sanitized URI (no credentials) for safer diagnostics.
 */
const mongoose = require('mongoose');
const { Logger } = require('../utils/logger');
require('dotenv').config();

const sanitizeMongoUri = (uri) => {
  if (!uri) return '';
  try {
    const parsed = new URL(uri);
    const protocol = parsed.protocol;
    const host = parsed.host;
    const pathname = parsed.pathname || '';
    const dbName = pathname.startsWith('/') ? pathname.slice(1) : pathname;
    const safeDb = dbName ? `/${dbName}` : '';
    return `${protocol}//${host}${safeDb}`;
  } catch {
    return uri.replace(/:\/\/(.*@)/, '://');
  }
};

const connectDB = async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    const error = new Error('MONGODB_URI is not set');
    Logger.error('MongoDB connection error', { error: error.message });
    throw error;
  }

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000
    });
    Logger.info('MongoDB connected successfully', { mongoUri: sanitizeMongoUri(uri) });
    return mongoose.connection;
  } catch (error) {
    Logger.error('MongoDB connection error', {
      error: error.message,
      mongoUri: sanitizeMongoUri(uri)
    });
    throw error;
  }
};

module.exports = connectDB;
