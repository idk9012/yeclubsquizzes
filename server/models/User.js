const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  passwordHash: String,
  role: { type: String, enum: ['student', 'admin'], default: 'student' },
  verified: { type: Boolean, default: false },
  verificationCode: String,
  resetCode: String, 
  settingsVerificationCode: String
});

module.exports = mongoose.model('User', userSchema);
