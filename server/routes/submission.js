const express = require('express');
const router = express.Router();
const Submission = require('../models/Submission');

// Save a quiz submission
router.post('/', async (req, res) => {
  try {
    const { userId, quizId, score, answers, isCompleted } = req.body;

    console.log('Submission request received:', { userId, quizId, score, answersCount: answers?.length, isCompleted });

    // Validate required fields
    if (!userId || !quizId) {
      console.error('Missing required fields:', { userId, quizId });
      return res.status(400).json({ error: 'Missing userId or quizId' });
    }

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
      
      console.log('Updated existing incomplete submission:', existingSubmission._id);
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
      
      console.log('Completed existing submission:', existingSubmission._id);
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
      
      console.log('Created new submission:', submission._id);
      return res.status(201).json({ 
        message: isCompleted ? 'Quiz completed successfully' : 'Quiz started',
        submissionId: submission._id,
        finalScore: isCompleted ? score : null
      });
    }
  } catch (err) {
    console.error('Submission error:', err);
    res.status(500).json({ error: 'Failed to save submission', details: err.message });
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

// Get detailed quiz review data for latest submission
router.get('/review-latest/:quizId', async (req, res) => {
  try {
    const { quizId } = req.params;
    const { userId } = req.query;
    
    console.log('Review latest request for quizId:', quizId, 'userId:', userId);
    
    // Build query - if userId is provided, filter by it
    const query = { 
      quizId: quizId,
      isCompleted: true 
    };
    
    if (userId) {
      query.userId = userId;
    }
    
    // Get the latest completed submission for this quiz (and user if specified)
    const submission = await Submission.findOne(query).sort({ submittedAt: -1 });
    
    if (!submission) {
      console.log('No completed submission found for quiz:', quizId, 'userId:', userId);
      return res.status(404).json({ error: 'No completed submission found for this quiz' });
    }
    
    console.log('Found submission:', submission._id);
    
    // Get quiz details
    const Quiz = require('../models/Quiz');
    const quiz = await Quiz.findById(quizId);
    if (!quiz) {
      console.log('Quiz not found:', quizId);
      return res.status(404).json({ error: 'Quiz not found' });
    }
    
    // Get all questions for this quiz
    const Question = require('../models/Question');
    const questions = await Question.find({ quizId: quizId }).sort({ createdAt: 1 });
    
    console.log('Found questions:', questions.length);
    
    // Build review data
    const reviewData = {
      quiz: {
        _id: quiz._id,
        title: quiz.title,
        description: quiz.description
      },
      submission: {
        _id: submission._id,
        score: submission.score,
        submittedAt: submission.submittedAt,
        answers: submission.answers
      },
      questions: questions.map((question, index) => {
        // Find the user's answer for this question
        const userAnswerObj = submission.answers.find(ans => 
          ans.questionId && ans.questionId.toString() === question._id.toString()
        );
        
        const userAnswer = userAnswerObj ? (Array.isArray(userAnswerObj.selectedOption) ? userAnswerObj.selectedOption : [userAnswerObj.selectedOption]) : [];
        const correctAnswers = question.correctAnswers || [];
        
        let isCorrect = false;
        let status = 'unanswered';
        
        if (userAnswer && userAnswer.length > 0 && userAnswer[0] !== null && userAnswer[0] !== undefined && userAnswer[0] !== '') {
          if (question.multiple) {
            // For multiple choice, all correct answers must be selected
            isCorrect = userAnswer.length === correctAnswers.length && 
                       userAnswer.every(ans => correctAnswers.includes(ans)) &&
                       correctAnswers.every(ans => userAnswer.includes(ans));
          } else {
            // For single choice
            isCorrect = userAnswer[0] === correctAnswers[0];
          }
          status = isCorrect ? 'correct' : 'incorrect';
        }
        
        return {
          questionId: question._id,
          text: question.text,
          options: question.options,
          correctAnswers: correctAnswers,
          userAnswers: userAnswer,
          isCorrect: isCorrect,
          status: status,
          multiple: question.multiple,
          mediaUrl: question.mediaUrl
        };
      })
    };
    
    // Calculate statistics
    const totalQuestions = questions.length;
    const correctCount = reviewData.questions.filter(q => q.status === 'correct').length;
    const incorrectCount = reviewData.questions.filter(q => q.status === 'incorrect').length;
    const unansweredCount = reviewData.questions.filter(q => q.status === 'unanswered').length;
    const percentage = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
    
    reviewData.statistics = {
      totalQuestions,
      correctCount,
      incorrectCount,
      unansweredCount,
      percentage
    };
    
    console.log('Review data prepared successfully');
    res.json(reviewData);
    
  } catch (err) {
    console.error('Quiz review error:', err);
    res.status(500).json({ error: 'Failed to fetch quiz review data', details: err.message });
  }
});

// Get detailed quiz review data for a user's completed submission
router.get('/review/:userId/:quizId', async (req, res) => {
  try {
    const { userId, quizId } = req.params;
    
    console.log('Review request for userId:', userId, 'quizId:', quizId);
    
    // Get the user's completed submission
    const submission = await Submission.findOne({
      userId: userId,
      quizId: quizId,
      isCompleted: true
    }).sort({ submittedAt: -1 });
    
    if (!submission) {
      console.log('No completed submission found for user:', userId, 'quiz:', quizId);
      return res.status(404).json({ error: 'No completed submission found' });
    }
    
    console.log('Found submission:', submission._id);
    
    // Get quiz details and questions
    const Quiz = require('../models/Quiz');
    const Question = require('../models/Question');
    
    const quiz = await Quiz.findById(quizId);
    const questions = await Question.find({ quizId: quizId }).sort({ createdAt: 1 });
    
    if (!quiz || !questions.length) {
      console.log('Quiz or questions not found');
      return res.status(404).json({ error: 'Quiz or questions not found' });
    }
    
    console.log('Found questions:', questions.length);
    
    // Calculate detailed results
    const userAnswers = submission.answers || [];
    const reviewData = {
      quiz: {
        title: quiz.title,
        description: quiz.description,
        totalMarks: quiz.totalMarks
      },
      submission: {
        score: submission.score,
        submittedAt: submission.submittedAt,
        startedAt: submission.startedAt
      },
      questions: questions.map((question, index) => {
        const userAnswerObj = submission.answers.find(ans => 
          ans.questionId && ans.questionId.toString() === question._id.toString()
        );
        const userAnswer = userAnswerObj ? (Array.isArray(userAnswerObj.selectedOption) ? userAnswerObj.selectedOption : [userAnswerObj.selectedOption]) : [];
        const correctAnswers = question.correctAnswers || [];
        
        let isCorrect = false;
        let status = 'unanswered';
        
        if (userAnswer.length > 0 && userAnswer[0] !== null && userAnswer[0] !== undefined && userAnswer[0] !== '') {
          if (question.multiple) {
            // For multiple choice, all correct answers must be selected
            isCorrect = userAnswer.length === correctAnswers.length && 
                       userAnswer.every(ans => correctAnswers.includes(ans)) &&
                       correctAnswers.every(ans => userAnswer.includes(ans));
          } else {
            // For single choice
            isCorrect = userAnswer[0] === correctAnswers[0];
          }
          status = isCorrect ? 'correct' : 'incorrect';
        }
        
        return {
          questionId: question._id,
          text: question.text,
          options: question.options,
          correctAnswers: correctAnswers,
          userAnswers: userAnswer,
          isCorrect: isCorrect,
          status: status,
          multiple: question.multiple,
          mediaUrl: question.mediaUrl
        };
      })
    };
    
    // Calculate statistics
    const totalQuestions = questions.length;
    const correctCount = reviewData.questions.filter(q => q.status === 'correct').length;
    const incorrectCount = reviewData.questions.filter(q => q.status === 'incorrect').length;
    const unansweredCount = reviewData.questions.filter(q => q.status === 'unanswered').length;
    const percentage = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
    
    reviewData.statistics = {
      totalQuestions,
      correctCount,
      incorrectCount,
      unansweredCount,
      percentage
    };
    
    console.log('Review data prepared successfully');
    res.json(reviewData);
    
  } catch (err) {
    console.error('Quiz review error:', err);
    res.status(500).json({ error: 'Failed to fetch quiz review data', details: err.message });
  }
});

module.exports = router;

