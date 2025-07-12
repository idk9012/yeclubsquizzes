const express = require('express');
const Quiz = require('../models/Quiz');
const Submission = require('../models/Submission');
const router = express.Router();

// ✅ Check quiz access status for a user
router.get('/access/:quizId/:userId', async (req, res) => {
  try {
    const { quizId, userId } = req.params;
    
    // Find the most recent submission for this user and quiz
    const latestSubmission = await Submission.findOne({
      quizId: quizId,
      userId: userId
    }).sort({ submittedAt: -1 });
    
    if (!latestSubmission) {
      // No previous attempt - allow access
      return res.json({ 
        canAccess: true, 
        reason: 'first_attempt',
        message: 'You can start this quiz.'
      });
    }
    
    if (latestSubmission.isCompleted) {
      // Quiz was completed - deny access but offer review
      const Question = require('../models/Question');
      const questions = await Question.find({ quizId });
      const totalQuestions = questions.length;
      const percentage = totalQuestions > 0 ? Math.round((latestSubmission.score / totalQuestions) * 100) : 0;
      
      return res.json({ 
        canAccess: false, 
        reason: 'already_completed',
        message: 'You have already completed this quiz.',
        completedAt: latestSubmission.submittedAt,
        score: latestSubmission.score,
        percentage: percentage,
        totalQuestions: totalQuestions,
        canReview: true
      });
    } else {
      // Quiz was started but not completed - allow access
      return res.json({ 
        canAccess: true, 
        reason: 'resume_attempt',
        message: 'You can resume this quiz.',
        startedAt: latestSubmission.startedAt
      });
    }
    
  } catch (err) {
    console.error('Quiz access check error:', err);
    res.status(500).json({ error: 'Failed to check quiz access' });
  }
});

// ✅ Get all public quizzes (for quizzes.html)
router.get('/public', async (req, res) => {
  try {
    const publicQuizzes = await Quiz.find({ isPrivate: false });
    res.json(publicQuizzes);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch public quizzes' });
  }
});

// ✅ Get quiz by ID (e.g. for start-quiz.html)
// Get a specific quiz by ID
router.get('/:id', async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) return res.status(404).json({ error: 'Quiz not found' });
    res.json(quiz);
  } catch (err) {
    console.error('Fetch quiz error:', err);
    res.status(500).json({ error: 'Failed to fetch quiz' });
  }
});

// ✅ Update entire quiz including questions
router.put('/edit/:id', async (req, res) => {
  try {
    const updatedQuiz = await Quiz.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updatedQuiz) return res.status(404).json({ error: 'Quiz not found' });
    res.json({ message: 'Quiz updated', quiz: updatedQuiz });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update quiz' });
  }
});


// Submit answers
router.post('/submit', async (req, res) => {
  const { userId, quizId, score } = req.body;
  // Optionally store in a new model, e.g., Submission, with fields userId, quizId, score, dateTimestamp
  // For now:
  res.json({ message: 'Score submitted' });
});


module.exports = router;
