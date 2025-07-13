const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const cors = require('cors');
const uploadRoutes = require('./routes/upload');
const questionRoutes = require('./routes/question');
const submissionRoutes = require('./routes/submission');
const emailRoutes = require('./routes/email');
dotenv.config({ path: path.join(__dirname, '../.env') });

const app = express();

// Enable CORS for all routes
app.use(cors());

// Parse JSON and form data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from client/public
app.use(express.static(path.join(__dirname, '../client/public')));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/quiz', require('./routes/quiz'));
app.use('/api/question', require('./routes/question'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/upload', require('./routes/upload'));
app.use('/api/messages', require('./routes/messages'));
app.use('/api/user', require('./routes/user'));
app.use('/api/submission', submissionRoutes);
app.use('/api/email', emailRoutes);

// Leaderboard endpoint
app.get('/api/leaderboard', async (req, res) => {
  try {
    const Submission = require('./models/Submission');
    const User = require('./models/User');
    
    // Get all submissions with user details
    const submissions = await Submission.find({}).populate('userId', 'name email');
    
    // Group submissions by user and calculate totals
    const userStats = {};
    
    for (const submission of submissions) {
      if (!submission.userId) {
        console.warn("Skipping submission due to missing userId:", submission);
        continue; // Skip this submission if userId is missing
      }

      const userId = submission.userId._id ? submission.userId._id.toString() : submission.userId.toString();
      const userName = submission.userId.name || `User_${userId.substring(0, 6)}`; // Fallback for missing name
      
      if (!userStats[userId]) {
        userStats[userId] = {
          userId,
          userName,
          totalScore: 0,
          quizzesTaken: 0,
          scores: []
        };
      }
      
      userStats[userId].totalScore += submission.score;
      userStats[userId].quizzesTaken += 1;
      userStats[userId].scores.push(submission.score);
    }
    
    // Convert to array and calculate averages
    const leaderboard = Object.values(userStats).map(user => ({
      ...user,
      averageScore: user.totalScore / user.quizzesTaken
    }));
    
    // Sort by total score (descending)
    leaderboard.sort((a, b) => b.totalScore - a.totalScore);
    
    res.json(leaderboard);
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({ error: 'Failed to load leaderboard' });
  }
});

// MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB error', err));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
  console.log('404 - Route not found:', req.method, req.url);
  res.status(404).json({ error: 'Route not found' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📁 Serving static files from: ${path.join(__dirname, '../client/public')}`);
  console.log(`📁 Serving uploads from: ${path.join(__dirname, 'uploads')}`);
});
