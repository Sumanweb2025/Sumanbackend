

const express = require('express');
const router = express.Router();
const {
  createPaymentIntent,
  confirmPaymentAndCreateOrder,
  processCODPayment,
  getPaymentMethods,
  getCanadianProvinces,
  handleStripeWebhook
} = require('../Controllers/payment.controller');

// Middleware to verify JWT token
const authMiddleware = require('../Middleware/auth.middleware');

// Get available payment methods for Canada
router.get('/methods', getPaymentMethods);

// Get Canadian provinces with tax rates
router.get('/provinces', getCanadianProvinces);

// Create payment intent for Stripe with Canadian payment methods
router.post('/create-intent', authMiddleware, createPaymentIntent);

// Confirm payment and create order
router.post('/confirm', authMiddleware, confirmPaymentAndCreateOrder);

// Process COD payment (admin only - when order is delivered)
router.post('/cod/:orderId', authMiddleware, processCODPayment);

// Stripe webhook for payment events
router.post('/webhook', express.raw({ type: 'application/json' }), handleStripeWebhook);

module.exports = router;