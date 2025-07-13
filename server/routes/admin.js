const express = require('express');
const router = express.Router();
const Quiz = require('../models/Quiz');
const Submission = require('../models/Submission');

// ✅ CREATE quiz (admin only)
router.post('/quiz', async (req, res) => {
  try {
    const quiz = new Quiz(req.body);
    await quiz.save();
    res.status(201).json(quiz);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create quiz' });
  }
});

// ✅ UPDATE quiz (admin only)
router.put('/quiz/:id', async (req, res) => {
  try {
    const updated = await Quiz.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update quiz' });
  }
});

// ✅ DELETE quiz (admin only)
router.delete('/quiz/:id', async (req, res) => {
  try {
    await Quiz.findByIdAndDelete(req.params.id);
    res.json({ message: 'Quiz deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete quiz' });
  }
});

// ✅ GET ALL quizzes (admin list)
router.get('/quizzes', async (req, res) => {
  try {
    console.log('Fetching quizzes...');
    const quizzes = await Quiz.find().sort({ createdAt: -1 });
    console.log('Found quizzes:', quizzes.length);
    res.json(quizzes);
  } catch (err) {
    console.error('Error in /quizzes route:', err);
    res.status(500).json({ error: 'Failed to load quizzes' });
  }
});

// ✅ GET quiz statistics (admin only)
router.get('/quiz/:id/statistics', async (req, res) => {
  try {
    const quizId = req.params.id;
    
    // Get all submissions for this quiz with user details
    const submissions = await Submission.find({ quizId }).sort({ submittedAt: -1 });
    
    // Get quiz details to calculate total questions
    const Question = require('../models/Question');
    const questions = await Question.find({ quizId });
    const totalQuestions = questions.length;
    
    // Get user details for each submission
    const User = require('../models/User');
    const statistics = await Promise.all(submissions.map(async (submission) => {
      const user = await User.findById(submission.userId);
      return {
        userId: submission.userId,
        userName: user ? user.name : 'Unknown User',
        userEmail: user ? user.email : 'Unknown Email',
        score: submission.score,
        totalQuestions: totalQuestions,
        submittedAt: submission.submittedAt,
        answers: submission.answers
      };
    }));
    
    res.json(statistics);
  } catch (err) {
    console.error('Error fetching quiz statistics:', err);
    res.status(500).json({ error: 'Failed to load quiz statistics' });
  }
});

module.exports = router;
