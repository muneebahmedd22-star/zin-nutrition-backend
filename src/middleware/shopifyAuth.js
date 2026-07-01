const crypto = require('crypto');
const config = require('../config');

/**
 * Shopify Webhook signature verification middleware
 */
function verifyShopifyWebhook(req, res, next) {
  const hmacHeader = req.headers['x-shopify-hmac-sha256'];
  if (!hmacHeader) {
    console.warn('Webhook received but X-Shopify-Hmac-Sha256 header is missing.');
    return res.status(401).json({ success: false, message: 'Missing webhook signature header.' });
  }

  const sharedSecret = config.shopifyWebhookSecret;
  if (!sharedSecret) {
    console.warn('SHOPIFY_WEBHOOK_SECRET is not configured. Webhook verification skipped.');
    return next();
  }

  // Calculate HMAC hash based on raw body
  const calculatedHmac = crypto
    .createHmac('sha256', sharedSecret)
    .update(req.rawBody)
    .digest('base64');

  if (calculatedHmac !== hmacHeader) {
    console.warn('Shopify webhook validation failed. Invalid HMAC signature.');
    return res.status(401).json({ success: false, message: 'Invalid webhook signature.' });
  }

  next();
}

module.exports = verifyShopifyWebhook;
