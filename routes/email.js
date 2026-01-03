/**
 * routes/email.js
 *
 * Email workflows:
 * - Verification emails
 * - Password reset
 *
 * Note: Email sending depends on SMTP environment variables.
 */
const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const User = require('../models/User');
const { sendVerificationEmail, sendPasswordResetEmail } = require('../utils/email');
const { Logger } = require('../utils/logger');
const { body, validationResult } = require('express-validator');

// Request email verification
router.post('/send-verification', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const user = await User.findById(req.session.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({ message: 'Email already verified' });
    }

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    user.emailVerificationToken = verificationToken;
    user.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    await user.save();

    // Send email
    await sendVerificationEmail(user, verificationToken);

    Logger.info('Verification email requested', { userId: user._id });
    res.json({ message: 'Verification email sent successfully' });
  } catch (error) {
    Logger.error('Error sending verification email', { error: error.message });
    res.status(500).json({ message: 'Failed to send verification email' });
  }
});

// Verify email with token
router.get('/verify/:token', async (req, res) => {
  try {
    const nowDate = new Date();
    const nowMs = Date.now();
    const user = await User.findOne({
      emailVerificationToken: req.params.token,
      $or: [
        { emailVerificationExpires: { $gt: nowDate } },
        { emailVerificationExpires: { $type: 'number', $gt: nowMs } }
      ]
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired verification token' });
    }

    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    Logger.info('Email verified successfully', { userId: user._id });
    
    // Auto-login the user
    req.session.userId = user._id;
    req.session.username = user.username;

    res.json({ 
      message: 'Email verified successfully!',
      user: {
        username: user.username,
        email: user.email
      }
    });
  } catch (error) {
    Logger.error('Error verifying email', { error: error.message });
    res.status(500).json({ message: 'Email verification failed' });
  }
});

// Request password reset
router.post('/forgot-password', [
  body('email').isEmail().normalizeEmail()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const user = await User.findOne({ email: req.body.email });
    
    // Don't reveal if user exists or not for security
    if (!user) {
      return res.json({ message: 'If that email exists, a password reset link has been sent' });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    user.passwordResetToken = resetToken;
    user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await user.save();

    // Send email
    await sendPasswordResetEmail(user, resetToken);

    Logger.info('Password reset requested', { userId: user._id });
    res.json({ message: 'If that email exists, a password reset link has been sent' });
  } catch (error) {
    Logger.error('Error requesting password reset', { error: error.message });
    res.status(500).json({ message: 'Failed to process password reset request' });
  }
});

// Reset password with token
router.post('/reset-password/:token', [
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain uppercase, lowercase, and number')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const nowDate = new Date();
    const nowMs = Date.now();
    const user = await User.findOne({
      passwordResetToken: req.params.token,
      $or: [
        { passwordResetExpires: { $gt: nowDate } },
        { passwordResetExpires: { $type: 'number', $gt: nowMs } }
      ]
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(req.body.password, 10);
    user.password = hashedPassword;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    Logger.info('Password reset successful', { userId: user._id });
    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    Logger.error('Error resetting password', { error: error.message });
    res.status(500).json({ message: 'Failed to reset password' });
  }
});

module.exports = router;
