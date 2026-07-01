const dotenv = require('dotenv');
dotenv.config();

module.exports = {
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseKey: process.env.SUPABASE_KEY,
  geminiApiKey: process.env.GEMINI_API_KEY,
  openaiApiKey: process.env.OPENAI_API_KEY,
  ragTopK: parseInt(process.env.RAG_TOP_K || '5', 10),
  shopifyWebhookSecret: process.env.SHOPIFY_WEBHOOK_SECRET,
  smtpHost: process.env.SMTP_HOST || 'smtp.hostinger.com',
  smtpPort: parseInt(process.env.SMTP_PORT || '465', 10),
  smtpUser: process.env.SMTP_USER,
  smtpPass: process.env.SMTP_PASS,
  adminApiKey: process.env.ADMIN_API_KEY || 'default-secret-key-change-me'
};
