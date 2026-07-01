const express = require('express');
const verifyShopifyWebhook = require('../middleware/shopifyAuth');
const { handleOrderPaidWebhook } = require('../controllers/webhookController');

const router = express.Router();

router.post('/shopify/orders-paid', verifyShopifyWebhook, handleOrderPaidWebhook);

module.exports = router;
