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
    const newMessage = new Message({ name, email, subject, message, userId });
    await newMessage.save();
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
    if (!message) return res.status(400).json({ error: 'Reply message is required' });

    const messageDoc = await Message.findById(messageId);
    if (!messageDoc) return res.status(404).json({ error: 'Message not found' });

    messageDoc.replies.push({ message, createdAt: new Date() });
    messageDoc.replied = true;
    await messageDoc.save();

    try {
      const emailResult = await sendEmailReply(
        messageDoc.email,
        messageDoc.name,
        messageDoc.subject,
        message,
        messageDoc.message
      );
      if (!emailResult.success) console.error('Email send error:', emailResult.error);
    } catch (emailErr) {
      console.error('Email service failed:', emailErr);
    }

    res.json({ message: 'Reply sent successfully' });
  } catch (error) {
    console.error('Reply error:', error);
    res.status(500).json({ error: 'Failed to send reply' });
  }
});

// Delete a message (admin)
router.delete('/:messageId', async (req, res) => {
  try {
    const { messageId } = req.params;
    const deleted = await Message.findByIdAndDelete(messageId);
    if (!deleted) return res.status(404).json({ error: 'Message not found' });
    res.json({ message: 'Message deleted successfully' });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ error: 'Failed to delete message' });
  }
});

// Get messages for a specific user (student)
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const messages = await Message.find({ userId }).sort({ createdAt: -1 });
    res.json(messages);
  } catch (error) {
    console.error('User messages error:', error);
    res.status(500).json({ error: 'Failed to load messages' });
  }
});

module.exports = router;
