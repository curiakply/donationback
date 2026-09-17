// routes/forgotPasswordRoutes.js
const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const Admin = require('../models/admin.model'); // adjust path to your admin/user model

// In-memory OTP store (use Redis in production for multi-instance)
const otpStore = new Map();

// Configure your email transporter
const transporter = nodemailer.createTransport({
  // Option 1: Gmail (enable "ljqr cwzv hwgt jizs" in Google account)
  service: 'gmail',
  auth: { user: 'fmundakayam@gmail.com', pass: 'ljqrcwzvhwgtjizs' }

  // Option 2: Custom SMTP
  // host: process.env.SMTP_HOST || 'smtp.gmail.com',
  // port: parseInt(process.env.SMTP_PORT || '587'),
  // secure: false,
  // auth: {
  //   user: process.env.SMTP_EMAIL,
  //   pass: process.env.SMTP_PASSWORD,
  // },
});
transporter.verify((err, success) => {
  if (err) {
    console.log('SMTP config error:', err);
  } else {
    console.log('SMTP ready');
  }
});
// Generate 6-digit OTP
function generateOTP() {
  return crypto.randomInt(100000, 999999).toString();
}

// POST /auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required' });

    const admin = await Admin.findOne({ email: email.toLowerCase().trim() });
    if (!admin) {
      // Don't reveal if email exists — still return success
      return res.json({ message: 'If an account exists with this email, an OTP has been sent.' });
    }

    const otp = generateOTP();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

    otpStore.set(email.toLowerCase().trim(), {
      otp,
      expiresAt,
      attempts: 0,
    });

    // Send email
    await transporter.sendMail({
      from: `"Curia Admin" <${'fmundakayam@gmail.com'}>`,
      to: email,
      subject: 'Password Reset OTP',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
          <h2 style="color: #2563EB;">Password Reset</h2>
          <p>Your OTP for password reset is:</p>
          <div style="background: #F1F5F9; padding: 16px; text-align: center; border-radius: 8px; margin: 16px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #1E40AF;">${otp}</span>
          </div>
          <p style="color: #64748B; font-size: 14px;">This code expires in 10 minutes. If you didn't request this, ignore this email.</p>
        </div>
      `,
    });

    res.json({ message: 'OTP sent successfully' });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ message: 'Failed to send OTP. Please try again.' });
  }
});

// POST /auth/verify-otp
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ message: 'Email and OTP are required' });

    const key = email.toLowerCase().trim();
    const stored = otpStore.get(key);

    if (!stored) {
      return res.status(400).json({ message: 'No OTP found. Please request a new one.' });
    }

    if (Date.now() > stored.expiresAt) {
      otpStore.delete(key);
      return res.status(400).json({ message: 'OTP expired. Please request a new one.' });
    }

    if (stored.attempts >= 5) {
      otpStore.delete(key);
      return res.status(429).json({ message: 'Too many attempts. Please request a new OTP.' });
    }

    if (stored.otp !== otp) {
      stored.attempts++;
      return res.status(400).json({ message: 'Invalid OTP. Please try again.' });
    }

    // OTP valid — generate a reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    otpStore.set(key, {
      resetToken,
      expiresAt: Date.now() + 15 * 60 * 1000, // 15 min to reset
    });

    res.json({ message: 'OTP verified', resetToken });
  } catch (err) {
    console.error('Verify OTP error:', err);
    res.status(500).json({ message: 'Verification failed' });
  }
});

// POST /auth/reset-password
router.post('/reset-password', async (req, res) => {
  try {
    const { email, resetToken, newPassword } = req.body;
    if (!email || !resetToken || !newPassword) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const key = email.toLowerCase().trim();
    const stored = otpStore.get(key);

    if (!stored || stored.resetToken !== resetToken) {
      return res.status(400).json({ message: 'Invalid or expired reset session. Please start over.' });
    }

    if (Date.now() > stored.expiresAt) {
      otpStore.delete(key);
      return res.status(400).json({ message: 'Reset session expired. Please start over.' });
    }

    // Hash and update password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await Admin.findOneAndUpdate(
      { email: key },
      { password: hashedPassword }
    );

    // Clean up
    otpStore.delete(key);

    res.json({ message: 'Password reset successfully' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ message: 'Failed to reset password' });
  }
});

module.exports = router;