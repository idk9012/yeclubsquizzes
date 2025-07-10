const express = require('express');
const router = express.Router();
const Submission = require('../models/Submission');

// Save a quiz submission
router.post('/', async (req, res) => {
  try {
    const { userId, quizId, score, answers, isCompleted } = req.body;

    // Check if there's an existing incomplete submission for this user and quiz
    const existingSubmission = await Submission.findOne({
      userId: userId,
      quizId: quizId,
      isCompleted: false
    }).sort({ startedAt: -1 });

    if (existingSubmission && !isCompleted) {
      // Update existing incomplete submission
      existingSubmission.score = score;
      existingSubmission.answers = answers;
      existingSubmission.submittedAt = new Date();
      await existingSubmission.save();
      
      return res.status(200).json({ 
        message: 'Progress saved',
        submissionId: existingSubmission._id
      });
    } else if (existingSubmission && isCompleted) {
      // Mark existing submission as completed
      existingSubmission.score = score;
      existingSubmission.answers = answers;
      existingSubmission.isCompleted = true;
      existingSubmission.submittedAt = new Date();
      await existingSubmission.save();
      
      return res.status(200).json({ 
        message: 'Quiz completed successfully',
        submissionId: existingSubmission._id,
        finalScore: score
      });
    } else {
      // Create new submission
      const submission = new Submission({
        userId,
        quizId,
        score,
        answers,
        isCompleted: isCompleted || false,
        startedAt: new Date(),
        submittedAt: isCompleted ? new Date() : null
      });

      await submission.save();
      
      return res.status(201).json({ 
        message: isCompleted ? 'Quiz completed successfully' : 'Quiz started',
        submissionId: submission._id,
        finalScore: isCompleted ? score : null
      });
    }
  } catch (err) {
    console.error('Submission error:', err);
    res.status(500).json({ error: 'Failed to save submission' });
  }
});

// Get user's submission history for a specific quiz
router.get('/history/:userId/:quizId', async (req, res) => {
  try {
    const { userId, quizId } = req.params;
    
    const submissions = await Submission.find({
      userId: userId,
      quizId: quizId
    }).sort({ startedAt: -1 });
    
    res.json(submissions);
  } catch (err) {
    console.error('Submission history error:', err);
    res.status(500).json({ error: 'Failed to fetch submission history' });
  }
});

// Get user's latest submission for a quiz
router.get('/latest/:userId/:quizId', async (req, res) => {
  try {
    const { userId, quizId } = req.params;
    
    const latestSubmission = await Submission.findOne({
      userId: userId,
      quizId: quizId
    }).sort({ startedAt: -1 });
    
    if (!latestSubmission) {
      return res.status(404).json({ error: 'No submission found' });
    }
    
    res.json(latestSubmission);
  } catch (err) {
    console.error('Latest submission error:', err);
    res.status(500).json({ error: 'Failed to fetch latest submission' });
  }
});

// Start a new quiz attempt (creates incomplete submission)
router.post('/start', async (req, res) => {
  try {
    const { userId, quizId } = req.body;
    
    // Check if user already has a completed submission
    const completedSubmission = await Submission.findOne({
      userId: userId,
      quizId: quizId,
      isCompleted: true
    });
    
    if (completedSubmission) {
      return res.status(400).json({ 
        error: 'Quiz already completed',
        completedAt: completedSubmission.submittedAt,
        score: completedSubmission.score
      });
    }
    
    // Check if user has an incomplete submission
    const incompleteSubmission = await Submission.findOne({
      userId: userId,
      quizId: quizId,
      isCompleted: false
    });
    
    if (incompleteSubmission) {
      return res.status(200).json({ 
        message: 'Resuming existing attempt',
        submissionId: incompleteSubmission._id,
        startedAt: incompleteSubmission.startedAt
      });
    }
    
    // Create new incomplete submission
    const submission = new Submission({
      userId,
      quizId,
      score: 0,
      answers: [],
      isCompleted: false,
      startedAt: new Date()
    });
    
    await submission.save();
    
    res.status(201).json({ 
      message: 'Quiz attempt started',
      submissionId: submission._id,
      startedAt: submission.startedAt
    });
    
  } catch (err) {
    console.error('Start quiz error:', err);
    res.status(500).json({ error: 'Failed to start quiz' });
  }
});

module.exports = router;

