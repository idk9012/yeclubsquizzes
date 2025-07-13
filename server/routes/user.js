const express = require('express');
const router = express.Router();
const Submission = require('../models/Submission');
const Quiz = require('../models/Quiz');

// Get user summary statistics
router.get('/:userId/summary', async (req, res) => {
  try {
    const { userId } = req.params;
    console.log('Fetching summary for userId:', userId);
    
    // Get all submissions for the user
    const submissions = await Submission.find({ userId }).populate('quizId', 'title totalMarks');
    console.log('Found submissions:', submissions.length);
    
    if (submissions.length === 0) {
      return res.json({
        totalQuizzes: 0,
        totalScore: 0,
        averageScore: 0,
        accuracy: 0,
        averageTimePerQuestion: 0,
        recentQuizzes: []
      });
    }

    // Calculate statistics
    const totalQuizzes = submissions.length;
    const totalScore = submissions.reduce((sum, sub) => sum + (sub.score || 0), 0);
    const averageScore = totalQuizzes > 0 ? totalScore / totalQuizzes : 0;
    
    // Calculate accuracy (correct answers / total questions)
    const totalQuestions = submissions.reduce((sum, sub) => sum + (sub.answers ? sub.answers.length : 0), 0);
    const correctAnswers = submissions.reduce((sum, sub) => sum + (sub.score || 0), 0);
    const accuracy = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0;
    
    // Calculate average time per question (using estimated time since timeSpent field doesn't exist)
    const averageTimePerQuestion = 30; // Default estimate of 30 seconds per question
    
    // Get recent quizzes (last 5)
    const recentQuizzes = submissions
      .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt))
      .slice(0, 5)
      .map(sub => ({
        quizTitle: sub.quizId ? sub.quizId.title : 'Unknown Quiz',
        score: sub.score || 0,
        totalQuestions: sub.answers ? sub.answers.length : 0,
        submittedAt: sub.submittedAt,
        timeSpent: null, // No timeSpent data available
        accuracy: sub.answers && sub.answers.length > 0 ? ((sub.score || 0) / sub.answers.length) * 100 : 0
      }));

    const result = {
      totalQuizzes,
      totalScore,
      averageScore,
      accuracy,
      averageTimePerQuestion,
      recentQuizzes
    };

    console.log('Sending summary result:', result);
    res.json(result);

  } catch (error) {
    console.error('Error fetching user summary:', error);
    res.status(500).json({ error: 'Failed to fetch user summary' });
  }
});

module.exports = router;

