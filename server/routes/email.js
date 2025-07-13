const express = require('express');
const router = express.Router();
const { sendEmailReply } = require('../utils/emailService');

// POST /api/email/reply
router.post('/reply', async (req, res) => {
  const { studentEmail, studentName, subject, replyMessage, originalMessage } = req.body;

  if (!studentEmail || !studentName || !subject || !replyMessage || !originalMessage) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const result = await sendEmailReply(studentEmail, studentName, subject, replyMessage, originalMessage);

  if (result.success) {
    res.status(200).json({ message: 'Email sent', messageId: result.messageId });
  } else {
    res.status(500).json({ error: result.error || 'Failed to send email' });
  }
});

module.exports = router;
