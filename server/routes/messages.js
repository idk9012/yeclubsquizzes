const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const { sendEmailReply } = require('../utils/emailService');

// Send a new message (from student)
router.post('/send', async (req, res) => {
  try {
    const { name, email, subject, message, userId } = req.body;
    
    if (!name || !email || !subject || !message || !userId) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    
    const newMessage = new Message({
      name,
      email,
      subject,
      message,
      userId
    });
    
    await newMessage.save();
    console.log('New message saved:', newMessage);
    
    res.json({ message: 'Message sent successfully', id: newMessage._id });
  } catch (error) {
    console.error('Error saving message:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Get all messages (for admin)
router.get('/', async (req, res) => {
  try {
    const messages = await Message.find({})
      .populate('userId', 'name email')
      .sort({ createdAt: -1 });
    
    res.json(messages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to load messages' });
  }
});

// Reply to a message (admin only)
router.post('/:messageId/reply', async (req, res) => {
  try {
    const { messageId } = req.params;
    const { message } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Reply message is required' });
    }
    
    const messageDoc = await Message.findById(messageId);
    if (!messageDoc) {
      return res.status(404).json({ error: 'Message not found' });
    }
    
    // Add reply to the message
    messageDoc.replies.push({
      message,
      createdAt: new Date()
      // adminId can be added here if you implement admin authentication
    });
    
    messageDoc.replied = true;
    await messageDoc.save();
    
    // Send email reply to the student
    try {
      const emailResult = await sendEmailReply(
        messageDoc.email,
        messageDoc.name,
        messageDoc.subject,
        message,
        messageDoc.message
      );
      
      if (emailResult.success) {
        console.log('Email reply sent successfully to:', messageDoc.email);
      } else {
        console.error('Failed to send email reply:', emailResult.error);
      }
    } catch (emailError) {
      console.error('Error sending email reply:', emailError);
      // Don't fail the request if email fails, just log the error
    }
    
    console.log('Reply added to message:', messageId);
    res.json({ message: 'Reply sent successfully' });
  } catch (error) {
    console.error('Error sending reply:', error);
    res.status(500).json({ error: 'Failed to send reply' });
  }
});

// Get messages for a specific user (student)
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const messages = await Message.find({ userId })
      .sort({ createdAt: -1 });
    
    res.json(messages);
  } catch (error) {
    console.error('Error fetching user messages:', error);
    res.status(500).json({ error: 'Failed to load messages' });
  }
});

module.exports = router;

