const mongoose = require('mongoose');
require('dotenv').config();
const Submission = require('./server/models/Submission');

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const submission = await Submission.findOne({ 
    quizId: '68700b38fdee775eaa892829',
    isCompleted: true 
  }).sort({ submittedAt: -1 });
  
  console.log('Submission found:', !!submission);
  if (submission) {
    console.log('Score:', submission.score);
    console.log('Answers count:', submission.answers.length);
    console.log('First few answers:', JSON.stringify(submission.answers.slice(0, 3), null, 2));
  }
  process.exit(0);
}).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});

