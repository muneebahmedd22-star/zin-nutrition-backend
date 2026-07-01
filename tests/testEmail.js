const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const nodemailer = require('nodemailer');

// Load environment variables from .env if it exists
dotenv.config({ path: path.join(__dirname, '../.env') });

const host = process.env.SMTP_HOST || 'smtp.hostinger.com';
const port = parseInt(process.env.SMTP_PORT || '465', 10);
const user = process.env.SMTP_USER || 'info@zinnutrition.com';
const pass = process.env.SMTP_PASS;

async function sendTestEmail() {
  console.log('--- ZIN NUTRITION SMTP EMAIL VERIFIER ---');
  console.log(`SMTP Host: ${host}`);
  console.log(`SMTP Port: ${port}`);
  console.log(`SMTP User: ${user}`);

  if (!pass) {
    console.error('Error: SMTP_PASS is missing in your .env file or environment variables.');
    console.log('Please make sure you have added SMTP_PASS to your .env file before running this test.');
    process.exit(1);
  }

  const transporter = nodemailer.createTransport({
    host: host,
    port: port,
    secure: port === 465,
    auth: { user, pass }
  });

  const mailOptions = {
    from: `"Zin Nutrition Test" <${user}>`,
    to: user, // send to same address
    subject: 'Zin Nutrition SMTP Verification Mail',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
        <h2 style="color: #DAA520; border-bottom: 2px solid #111; padding-bottom: 10px;">SMTP Verification Successful!</h2>
        <p>This is a real test email sent to verify Hostinger SMTP credentials for your website <strong>Zin Nutrition</strong>.</p>
        <p>If you received this email, Nodemailer has successfully connected to <strong>smtp.hostinger.com</strong> and authenticated your account.</p>
        <br>
        <p>Timestamp: ${new Date().toLocaleString()}</p>
        <p><strong>Team Zin Nutrition AI Integration</strong></p>
      </div>
    `
  };

  try {
    console.log('Attempting to connect and send test email via Hostinger SMTP...');
    const info = await transporter.sendMail(mailOptions);
    console.log('SUCCESS: Email sent successfully!');
    console.log('Message ID:', info.messageId);
    console.log('Response:', info.response);
  } catch (error) {
    console.error('FAILED: SMTP Connection or Authentication failed:', error);
  }
}

sendTestEmail();
