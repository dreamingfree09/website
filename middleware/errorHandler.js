/**
 * middleware/errorHandler.js
 *
 * Centralized Express error handling.
 *
 * Converts common error shapes (Mongoose validation/duplicate key/cast) into
 * consistent JSON errors while logging a safe amount of diagnostic detail.
 */
const { Logger } = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
  // Log a minimal, privacy-minded error record.
  // Avoid logging query strings (tokens) and raw IPs/user agents.
  Logger.error('Request error', {
    name: err?.name,
    message: err?.message,
    code: err?.code,
    statusCode: err?.statusCode,
    method: req?.method,
    path: req?.path,
    ...(process.env.NODE_ENV === 'development' && err?.stack ? { stack: err.stack } : {}),
  });

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({
      error: 'Validation Error',
      details: errors
    });
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    return res.status(400).json({
      error: `A user with that ${field} already exists`
    });
  }

  // Mongoose CastError (invalid ObjectId)
  if (err.name === 'CastError') {
    return res.status(400).json({
      error: 'Invalid ID format'
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      error: 'Invalid token'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      error: 'Token expired'
    });
  }

  // Rate limit error
  if (err.status === 429) {
    return res.status(429).json({
      error: 'Too many requests, please try again later'
    });
  }

  // Default error
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    error: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

// 404 handler for undefined routes
const notFound = (req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
};

// Async error wrapper to catch errors in async route handlers
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = { errorHandler, notFound, asyncHandler };
