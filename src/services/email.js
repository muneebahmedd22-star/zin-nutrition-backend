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
 * @param {string} customerName - First name
 * @param {Buffer} pdfBuffer - Generated customized PDF binary
 * @param {Buffer} generalPdfBuffer - Complimentary general PDF binary
 * @param {boolean} isDiet - True if sending diet plan, false for workout program
 * @param {string} coupon - 50% discount coupon code to inject
 */
async function sendProgramEmail(toEmail, customerName, pdfBuffer, generalPdfBuffer = null, isDiet = false, coupon = '') {
  const transporter = getMailTransport();
  if (!transporter) {
    throw new Error('Nodemailer SMTP transport could not be initialized. Missing credentials.');
  }

  const planTitle = isDiet ? 'Diet & Nutrition Plan' : 'Training Program';
  const complimentaryTitle = isDiet ? 'General Workout Guide' : 'General Diet Guide';
  
  let couponText = '';
  if (coupon) {
    const nextProduct = isDiet ? 'Online Coaching Program' : '4-Week Personalized Meal Plan';
    couponText = `
      <div style="background-color: #FFF3CD; border: 1px solid #FFEBAA; border-radius: 8px; padding: 15px; margin: 25px 0; text-align: center;">
        <h4 style="margin: 0 0 8px 0; color: #856404; font-size: 16px;">🎁 Special Complimentary Gift!</h4>
        <p style="margin: 0 0 10px 0; font-size: 14px; color: #666;">Get **50% OFF** your customized <strong>${nextProduct}</strong>!</p>
        <div style="display: inline-block; background-color: #111; color: #fff; font-weight: bold; padding: 10px 20px; font-size: 18px; border-radius: 5px; letter-spacing: 1px;">
          ${coupon}
        </div>
        <p style="margin: 8px 0 0 0; font-size: 11px; color: #999;">Apply this code at checkout to claim your discount.</p>
      </div>
    `;
  }

  const mailOptions = {
    from: `"Zin Nutrition" <${config.smtpUser}>`,
    to: toEmail,
    subject: `Your Personalized ${planTitle} from Zin Nutrition`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #111; border-bottom: 2px solid #DAA520; padding-bottom: 10px;">Hello ${customerName}!</h2>
        <p>Thank you for choosing <strong>Zin Nutrition</strong>!</p>
        <p>Your payment has been successfully processed, and our expert coaching team has analyzed your assessment answers alongside our fitness guides to compile your plan.</p>
        <p>We are excited to share your fully customized, professional <strong>${planTitle}</strong>. We have attached the plan directly to this email.</p>
        
        <p>As requested, we have also attached a <strong>Complimentary ${complimentaryTitle}</strong> to support your wellness journey!</p>

        ${couponText}
        
        <p>You can also download this program anytime from your Zin Nutrition customer portal dashboard.</p>
        <p style="margin-top: 30px;">Best of luck with your fitness journey!</p>
        <p><strong>Team Zin Nutrition</strong></p>
      </div>
    `,
    attachments: [
      {
        filename: isDiet ? 'ZinNutrition_Diet_Plan.pdf' : 'ZinNutrition_Training_Program.pdf',
        content: pdfBuffer,
        contentType: 'application/pdf'
      }
    ]
  };

  if (generalPdfBuffer) {
    mailOptions.attachments.push({
      filename: isDiet ? 'ZinNutrition_General_Workout_Guide.pdf' : 'ZinNutrition_General_Diet_Guide.pdf',
      content: generalPdfBuffer,
      contentType: 'application/pdf'
    });
  }

  const info = await transporter.sendMail(mailOptions);
  console.log(`Email dispatched successfully to ${toEmail}:`, info.messageId);
  return info;
}

module.exports = {
  sendProgramEmail
};
