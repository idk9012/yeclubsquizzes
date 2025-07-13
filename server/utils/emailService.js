const nodemailer = require('nodemailer');

// Create transporter using Gmail
const createTransporter = () => {
  return nodemailer.createTransport({ 
    host: process.env.MAIL_HOST ,
    port: process.env.MAIL_PORT ,
    secure: true, // Use SSL
    auth: {
      user: process.env.MAIL_USER, // Gmail address used for verification codes
      pass: process.env.MAIL_PASS  // App password for Gmail
    }
  });
};

// Send email reply to student
const sendEmailReply = async (studentEmail, studentName, subject, replyMessage, originalMessage) => {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: process.env.MAIL_USER,
      to: studentEmail,
      subject: `Re: ${subject}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #4e73df;">Y.E. Quiz Platform - Admin Reply</h2>
          
          <div style="background-color: #f8f9fc; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #333; margin-top: 0;">Hello ${studentName},</h3>
            <p style="color: #666; line-height: 1.6;">
              We have received your message and here is our response:
            </p>
            
            <div style="background-color: white; padding: 15px; border-left: 4px solid #4e73df; margin: 15px 0;">
              <strong>Admin Reply:</strong><br>
              <p style="margin: 10px 0; color: #333;">${replyMessage}</p>
            </div>
            
            <div style="background-color: #e9ecef; padding: 15px; border-radius: 5px; margin: 15px 0;">
              <strong>Your Original Message:</strong><br>
              <p style="margin: 10px 0; color: #666; font-style: italic;">${originalMessage}</p>
            </div>
            
            <p style="color: #666; line-height: 1.6;">
              If you have any further questions, please don't hesitate to contact us through the platform.
            </p>
            
            <hr style="border: none; border-top: 1px solid #dee2e6; margin: 20px 0;">
            <p style="color: #999; font-size: 12px;">
              This is an automated message from Y.E. Quiz Platform. Please do not reply directly to this email.
            </p>
          </div>
        </div>
      `
    };
    
    const result = await transporter.sendMail(mailOptions);
    console.log('Email reply sent successfully:', result.messageId);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('Error sending email reply:', error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendEmailReply
};