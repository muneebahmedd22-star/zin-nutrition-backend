const nodemailer = require('nodemailer');
const config = require('../config');

/**
 * Creates the transport instance for Nodemailer using Hostinger SMTP
 */
function getMailTransport() {
  if (!config.smtpUser || !config.smtpPass) {
    console.warn('WARNING: SMTP credentials not set. Emails will not be sent.');
    return null;
  }
  
  return nodemailer.createTransport({
    host: config.smtpHost || 'smtp.hostinger.com',
    port: config.smtpPort || 465,
    secure: config.smtpPort === 465, // True for 465, false for 587
    auth: {
      user: config.smtpUser,
      pass: config.smtpPass
    }
  });
}

/**
 * Dispatch personalized program PDF to customer email
 * @param {string} toEmail - Customer email address
 * @param {string} customerName - First name / full name
 * @param {Buffer} pdfBuffer - Generated PDF binary
 */
async function sendProgramEmail(toEmail, customerName, pdfBuffer) {
  const transporter = getMailTransport();
  if (!transporter) {
    throw new Error('Nodemailer SMTP transport could not be initialized. Missing credentials.');
  }

  const mailOptions = {
    from: `"Zin Nutrition" <${config.smtpUser}>`,
    to: toEmail,
    subject: `Your Personalized Training Program from Zin Nutrition`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #111; border-bottom: 2px solid #DAA520; padding-bottom: 10px;">Hello ${customerName}!</h2>
        <p>Thank you for choosing <strong>Zin Nutrition Online Coaching</strong>!</p>
        <p>Your payment has been successfully processed, and our AI Personal Trainer has analyzed your assessment answers alongside our professional training knowledge base (NASM guidelines) to construct your plan.</p>
        <p>We are excited to share your fully customized, professional <strong>Training Program</strong>. We have attached the branded program PDF directly to this email for your convenience.</p>
        
        <div style="background-color: #f9f9f9; padding: 15px; border-left: 4px solid #111; margin: 20px 0;">
          <h4 style="margin: 0 0 5px 0; color: #111;">What's included in your program:</h4>
          <ul style="margin: 0; padding-left: 20px; font-size: 14px; color: #555;">
            <li>Weekly workout split tailored to your availability</li>
            <li>Fully detailed exercises, sets, reps, and rests</li>
            <li>Dynamic warm-up and cool-down protocols</li>
            <li>Progressive overload guidelines</li>
            <li>Safety precautions and injury recovery notes</li>
          </ul>
        </div>
        
        <p>You can also download this program anytime from your Zin Nutrition customer portal dashboard.</p>
        <p style="margin-top: 30px;">Best of luck with your workouts!</p>
        <p><strong>Team Zin Nutrition</strong></p>
      </div>
    `,
    attachments: [
      {
        filename: 'ZinNutrition_Training_Program.pdf',
        content: pdfBuffer,
        contentType: 'application/pdf'
      }
    ]
  };

  const info = await transporter.sendMail(mailOptions);
  console.log(`Email dispatched successfully to ${toEmail}:`, info.messageId);
  return info;
}

module.exports = {
  sendProgramEmail
};
