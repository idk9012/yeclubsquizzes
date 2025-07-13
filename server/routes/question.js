const express = require('express');
const multer = require('multer');
const path = require('path');
const router = express.Router();
const Question = require('../models/Question');
const Quiz = require('../models/Quiz');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../uploads')),
  filename: (req, file, cb) =>
    cb(null, Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname)),
});

const upload = multer({ 
  storage,
  fileFilter: (req, file, cb) => {
    // Accept images and videos
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image and video files are allowed!'), false);
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Save question with optional media upload
router.post('/save/:quizId', upload.single('media'), async (req, res) => {
  try {
    console.log('Received question save request:', req.body);
    console.log('File:', req.file);
    
    const { text, multiple, requireMedia } = req.body;
    
    // Parse JSON strings for options and correctAnswers
    let options = [];
    let correctAnswers = [];
    
    try {
      options = JSON.parse(req.body.options || '[]');
      correctAnswers = JSON.parse(req.body.correctAnswers || '[]');
    } catch (parseError) {
      console.error('JSON parsing error:', parseError);
      return res.status(400).json({ error: 'Invalid options or correctAnswers format' });
    }
    
    let mediaUrl = '';
    if (req.file) {
      mediaUrl = `/uploads/${req.file.filename}`;
    }
    
    const questionData = {
      quizId: req.params.quizId,
      text,
      options,
      correctAnswers,
      multiple: multiple === 'true',
      requireMedia: requireMedia === 'true',
      mediaUrl
    };
    
    console.log('Creating question with data:', questionData);
    
    const question = new Question(questionData);
    await question.save();
    
    console.log('Question saved successfully:', question);
    return res.json(question);
  } catch (err) {
    console.error('Error saving question:', err);
    return res.status(500).json({ error: err.message });
  }
});

// Get all questions for a quiz
router.get('/quiz/:quizId', async (req, res) => {
  try {
    console.log('Fetching questions for quiz:', req.params.quizId);
    const questions = await Question.find({ quizId: req.params.quizId });
    console.log('Found questions:', questions.length);
    res.json(questions);
  } catch (err) {
    console.error('Error fetching questions:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get a single question by ID
router.get('/:questionId', async (req, res) => {
  try {
    console.log('Fetching question:', req.params.questionId);
    const question = await Question.findById(req.params.questionId);
    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }
    res.json(question);
  } catch (err) {
    console.error('Error fetching question:', err);
    res.status(500).json({ error: err.message });
  }
});

// Edit/Update a question
router.put('/edit/:questionId', upload.single('media'), async (req, res) => {
  try {
    console.log('Received question edit request:', req.body);
    console.log('File:', req.file);
    
    const { text, multiple, requireMedia } = req.body;
    
    // Parse JSON strings for options and correctAnswers
    let options = [];
    let correctAnswers = [];
    
    try {
      options = JSON.parse(req.body.options || '[]');
      correctAnswers = JSON.parse(req.body.correctAnswers || '[]');
    } catch (parseError) {
      console.error('JSON parsing error:', parseError);
      return res.status(400).json({ error: 'Invalid options or correctAnswers format' });
    }
    
    // Find the existing question
    const existingQuestion = await Question.findById(req.params.questionId);
    if (!existingQuestion) {
      return res.status(404).json({ error: 'Question not found' });
    }
    
    // Prepare update data
    const updateData = {
      text,
      options,
      correctAnswers,
      multiple: multiple === 'true',
      requireMedia: requireMedia === 'true'
    };
    
    // Handle media upload
    if (req.file) {
      updateData.mediaUrl = `/uploads/${req.file.filename}`;
    }
    
    console.log('Updating question with data:', updateData);
    
    const updatedQuestion = await Question.findByIdAndUpdate(
      req.params.questionId,
      updateData,
      { new: true }
    );
    
    console.log('Question updated successfully:', updatedQuestion);
    return res.json(updatedQuestion);
  } catch (err) {
    console.error('Error updating question:', err);
    return res.status(500).json({ error: err.message });
  }
});

// Delete a question
router.delete('/:questionId', async (req, res) => {
  try {
    await Question.findByIdAndDelete(req.params.questionId);
    res.json({ message: 'Question deleted successfully' });
  } catch (err) {
    console.error('Error deleting question:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
