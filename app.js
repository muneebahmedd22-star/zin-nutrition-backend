const express = require('express');
const cors = require('cors');
const path = require('path');
const config = require('./src/config');

const assessmentRouter = require('./src/routes/assessment');
const adminRouter = require('./src/routes/admin');
const webhookRouter = require('./src/routes/webhooks');
const customerRouter = require('./src/routes/customer');

const app = express();

app.use(cors());

// Configure body parser to preserve rawBody for Shopify webhook HMAC verification
app.use(express.json({
  verify: (req, res, buf) => {
    if (req.originalUrl.startsWith('/api/webhooks')) {
      req.rawBody = buf;
    }
  }
}));

app.use(express.urlencoded({ extended: true }));

// Health Check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', time: new Date() });
});

// Register routers
app.use('/api/coaching-assessment', assessmentRouter);
app.use('/api/admin', adminRouter);
app.use('/api/webhooks', webhookRouter);
app.use('/api/customer', customerRouter);

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ success: false, message: err.message || 'Internal server error.' });
});

// Listen on dynamic port
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Zin Nutrition AI Backend running on port ${PORT} in ${config.nodeEnv || 'development'} mode.`);
});

module.exports = app;
