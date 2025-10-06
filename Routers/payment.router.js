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

// Middleware
const authMiddleware = require('../Middleware/auth.middleware');
const { optionalAuth } = require('../Middleware/auth.middleware'); // IMPORT THIS
const adminMiddleware = require('../Middleware/admin.middleware');

// WEBHOOK ROUTES
router.post('/webhook/stripe', express.raw({type: 'application/json'}), handleStripeWebhook);

// STRIPE PAYMENT ROUTES - USE optionalAuth for guest support
router.post('/create-intent', optionalAuth, createPaymentIntent);
router.post('/confirm-payment', optionalAuth, confirmPaymentAndCreateOrder);

// COD PAYMENT ROUTES - USE optionalAuth for guest support
router.post('/cod', optionalAuth, createCODOrder);

// PAYMENT MANAGEMENT ROUTES - Keep authMiddleware (only logged-in users)
router.get('/user', authMiddleware, getUserPayments);
router.get('/:paymentId', authMiddleware, getPaymentDetails);
router.put('/:paymentId/status', authMiddleware, adminMiddleware, updatePaymentStatus);

// PDF DOWNLOAD ROUTES
router.get('/:paymentId/pdf/:pdfType', authMiddleware, downloadPDF);

// REFUND ROUTES
router.post('/:paymentId/refund', authMiddleware, adminMiddleware, refundPayment);

// REFUND MANAGEMENT ROUTES
router.get('/admin/refunds', authMiddleware, adminMiddleware, getAllRefunds);
router.get('/admin/refunds/:refundId', authMiddleware, adminMiddleware, getRefundDetails);

// ADMIN ROUTES
router.get('/admin/all', authMiddleware, adminMiddleware, getAllPayments);
router.get('/admin/statistics', authMiddleware, adminMiddleware, getPaymentStatistics);

module.exports = router;