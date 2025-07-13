const express = require('express');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const User = require('../models/User');
const router = express.Router();

// ✅ Nodemailer transporter
const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST,
  port: process.env.MAIL_PORT,
  secure: true,
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS
  }
});

// ✅ Register
router.post('/signup', async (req, res) => {
  const { name, email, password } = req.body;

  try {
    if (password.length < 8 || password.toLowerCase() === email.toLowerCase()) {
      return res.status(400).json({ error: 'Invalid password' });
    }

    const existing = await User.findOne({ email });
    if (existing) return res.status(409).json({ error: 'Email already registered' });

    const passwordHash = await bcrypt.hash(password, 10);
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    const newUser = new User({
      name,
      email,
      passwordHash,
      role: 'student',
      verified: false,
      verificationCode: code
    });

    await newUser.save();

    await transporter.sendMail({
      from: '"Quiz App" <noreply@quiz.com>',
      to: email,
      subject: 'Verify your account',
      text: `Your verification code is: ${code}`
    });

    res.status(201).json({ message: 'Registered' });
  } catch (err) {
    console.error('❌ Registration error:', err);
    res.status(500).json({ error: 'Server error during registration' });
  }
});

// ✅ Admin Login
// Define allowed admin emails
const allowedAdmins = ['admin1@example.com', 'admin2@example.com'];

router.post('/admin-login', async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });

  if (!user) return res.status(401).json({ error: 'Incorrect email or password' });
  if (!allowedAdmins.includes(email)) return res.status(403).json({ error: 'Access denied' });

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return res.status(401).json({ error: 'Incorrect email or password' });

  if (!user.verified) return res.status(403).json({ error: 'Account not verified' });

  res.json({ userId: user._id, role: 'admin' });
});


// ✅ Normal Student Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });

  if (!user) return res.status(401).json({ error: 'Incorrect email or password' });

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return res.status(401).json({ error: 'Incorrect email or password' });

  if (!user.verified) return res.status(403).json({ error: 'not_verified' });

  res.json({ userId: user._id, role: user.role });
});

// ✅ Verify Account
router.post('/verify', async (req, res) => {
  const { email, code } = req.body;
  const user = await User.findOne({ email });

  if (!user) return res.status(404).json({ error: 'User not found' });
  if (user.verified) return res.status(400).json({ error: 'Already verified' });

  if (user.verificationCode === code) {
    user.verified = true;
    user.verificationCode = null;
    await user.save();
    return res.json({ message: 'Verified', userId: user._id });
  } else {
    return res.status(401).json({ error: 'Invalid code' });
  }
});

// ✅ Resend Verification Code
router.post('/resend-code', async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });

  if (!user) return res.status(404).json({ error: 'User not found' });
  if (user.verified) return res.status(400).json({ error: 'Already verified' });

  const newCode = Math.floor(100000 + Math.random() * 900000).toString();
  user.verificationCode = newCode;
  await user.save();

  try {
    await transporter.sendMail({
      from: '"Quiz App" <noreply@quiz.com>',
      to: email,
      subject: 'New Verification Code',
      text: `Your new verification code is: ${newCode}`
    });

    res.json({ message: 'Code resent successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to send code' });
  }
});

// ✅ Forgot Password
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });
  if (!user) return res.status(404).json({ error: 'User not found' });

  const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
  user.resetCode = resetCode;
  await user.save();

  try {
    await transporter.sendMail({
      from: '"Quiz App" <noreply@quiz.com>',
      to: email,
      subject: 'Password Reset Code',
      text: `Your reset code is: ${resetCode}`
    });

    res.json({ message: 'Reset code sent' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to send email' });
  }
});

// ✅ Reset Password
router.post('/reset-password', async (req, res) => {
  const { email, code, password } = req.body;

  if (!email || !code || password.length < 8)
    return res.status(400).json({ error: 'Invalid input' });

  const user = await User.findOne({ email });
  if (!user) return res.status(404).json({ error: 'User not found' });
  if (user.resetCode !== code) return res.status(401).json({ error: 'Invalid code' });

  user.passwordHash = await bcrypt.hash(password, 10);
  user.resetCode = null;
  await user.save();

  res.json({ message: 'Password changed successfully' });
});

// ✅ Request Verification for Settings Change
router.post('/request-settings-verification', async (req, res) => {
  const { userId } = req.body;
  const user = await User.findById(userId);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  user.settingsVerificationCode = code;
  await user.save();

  try {
    await transporter.sendMail({
      from: '"Quiz App" <noreply@quiz.com>',
      to: user.email,
      subject: 'Confirm Account Changes',
      text: `Your verification code is: ${code}`
    });

    res.json({ message: 'Code sent' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to send code' });
  }
});

// ✅ Confirm Settings Change (email or password)
router.post('/confirm-settings-change', async (req, res) => {
  const { userId, newEmail, newPassword, code } = req.body;

  if (!userId || !code) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (user.settingsVerificationCode !== code) {
      return res.status(401).json({ error: 'Invalid verification code' });
    }

    if (newEmail && newEmail !== user.email) {
      const existing = await User.findOne({ email: newEmail });
      if (existing) return res.status(409).json({ error: 'Email already in use' });
      user.email = newEmail;
    }

    if (newPassword) {
      user.passwordHash = await bcrypt.hash(newPassword, 10);
    }

    user.settingsVerificationCode = null;
    await user.save();

    res.json({ message: 'Account updated successfully', userId: user._id });
  } catch (err) {
    console.error('❌ Confirm settings error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ✅ Get user info by ID (for settings placeholder)
router.get('/user/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ email: user.email });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// ✅ Check if email is already verified
router.post('/check-verification', async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ verified: user.verified });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;