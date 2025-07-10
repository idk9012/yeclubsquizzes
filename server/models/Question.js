const mongoose = require('mongoose');
const QuestionSchema = new mongoose.Schema({
  quizId: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz', required: true },
  text: String,
  options: [String],
  correctAnswers: [String],
  multiple: Boolean,
  requireMedia: Boolean,
  mediaUrl: String
}, { timestamps: true });
module.exports = mongoose.model('Question', QuestionSchema);
