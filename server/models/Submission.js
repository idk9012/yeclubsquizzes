const mongoose = require('mongoose');
const SubmissionSchema = new mongoose.Schema({
  quizId: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  score: Number,
  submittedAt: { type: Date, default: Date.now },
  isCompleted: { type: Boolean, default: false },
  attemptNumber: { type: Number, default: 1 },
  startedAt: { type: Date, default: Date.now },
  answers: [{ 
    questionId: mongoose.Schema.Types.ObjectId,
    selectedOption: mongoose.Schema.Types.Mixed, // Can be String or Array for multiple choice
    isCorrect: Boolean 
  }]
});
module.exports = mongoose.model('Submission', SubmissionSchema);
