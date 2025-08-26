const express = require('express');
const router = express.Router();
const {
  createPaymentIntent,
  confirmPaymentAndCreateOrder,
  createCODOrder,
  updatePaymentStatus,
  getPaymentDetails,
  downloadPDF,
  getAllPayments,
  getUserPayments,
  refundPayment,
  getPaymentStatistics,
  handleStripeWebhook,
  getRefundDetails,
  getAllRefunds
} = require('../Controllers/payment.controller');

// Middleware to verify JWT token
const authMiddleware = require('../Middleware/auth.middleware');
// Admin middleware (you'll need to create this if not exists)
const adminMiddleware = require('../Middleware/admin.middleware');

// WEBHOOK ROUTES - ADD THIS BEFORE YOUR AUTH ROUTES
// POST /api/payments/webhook/stripe - Stripe webhook handler (no auth required)
router.post('/webhook/stripe', express.raw({type: 'application/json'}), handleStripeWebhook);

// STRIPE PAYMENT ROUTES
// POST /api/payments/create-intent - Create payment intent for Stripe
router.post('/create-intent', authMiddleware, createPaymentIntent);

// POST /api/payments/confirm-payment - Confirm payment and create order
router.post('/confirm-payment', authMiddleware, confirmPaymentAndCreateOrder);

// COD PAYMENT ROUTES
// POST /api/payments/cod - Create COD order
router.post('/cod', authMiddleware, createCODOrder);

// PAYMENT MANAGEMENT ROUTES
// GET /api/payments/user - Get user's payment history
router.get('/user', authMiddleware, getUserPayments);

// GET /api/payments/:paymentId - Get specific payment details
router.get('/:paymentId', authMiddleware, getPaymentDetails);

// PUT /api/payments/:paymentId/status - Update payment status (admin only)
router.put('/:paymentId/status', authMiddleware, adminMiddleware, updatePaymentStatus);

// PDF DOWNLOAD ROUTES
// GET /api/payments/:paymentId/pdf/:pdfType - Download PDF (orderConfirmation, invoice, bill)
router.get('/:paymentId/pdf/:pdfType', authMiddleware, downloadPDF);

// REFUND ROUTES
// POST /api/payments/:paymentId/refund - Process refund (admin only)
router.post('/:paymentId/refund', authMiddleware, adminMiddleware, refundPayment);

// REFUND MANAGEMENT ROUTES - ADD THESE AFTER YOUR EXISTING ROUTES
// GET /api/payments/admin/refunds - Get all refunds (admin only)
router.get('/admin/refunds', authMiddleware, adminMiddleware, getAllRefunds);

// GET /api/payments/admin/refunds/:refundId - Get specific refund details (admin only)
router.get('/admin/refunds/:refundId', authMiddleware, adminMiddleware, getRefundDetails);

// ADMIN ROUTES
// GET /api/payments/admin/all - Get all payments (admin only)
router.get('/admin/all', authMiddleware, adminMiddleware, getAllPayments);

// GET /api/payments/admin/statistics - Get payment statistics (admin only)
router.get('/admin/statistics', authMiddleware, adminMiddleware, getPaymentStatistics);

module.exports = router;