const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  _id: String,
  text: String,
  options: [String],
  correctAnswers: [String],
  multiple: Boolean,
  requireMedia: Boolean
});

const quizSchema = new mongoose.Schema({
  title: String,
  description: String,
  questions: [questionSchema],
  createdBy: String,
  isPublic: Boolean,
  isPrivate: { type: Boolean, default: false },
  duration: { type: Number, default: 60 }, // Duration in minutes
  totalMarks: { type: Number, default: 0 }, // Total marks for the quiz
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Quiz', quizSchema);
