const express = require('express');
const router = express.Router();
const {
  getCheckoutData,
  createOrder,
  getUserOrders,
  getOrderById,
  updateOrderStatus,
  applyCoupon,
  getAvailableCoupons,
  trackOrder,
  createPaymentIntent,
  confirmPaymentAndCreateOrder
} = require('../Controllers/order.controller');

// Middleware to verify JWT token
const authMiddleware = require('../Middleware/auth.middleware');

// Get checkout data (cart items and totals)
router.get('/checkout', authMiddleware, getCheckoutData);

// Create new order (for COD)
router.post('/', authMiddleware, createOrder);

// NEW STRIPE ROUTES
// Create payment intent for Stripe
router.post('/create-payment-intent', authMiddleware, createPaymentIntent);

// Confirm payment and create order
router.post('/confirm-payment', authMiddleware, confirmPaymentAndCreateOrder);

// POST /api/orders/apply-coupon - Apply coupon code
router.post('/apply-coupon', authMiddleware, applyCoupon);

// GET /api/orders/coupons - Get available coupons
router.get('/coupons', authMiddleware, getAvailableCoupons);

// Get user's orders
router.get('/', authMiddleware, getUserOrders);

// Get single order by ID
router.get('/:orderId', authMiddleware, getOrderById);

// Update order status (admin only - you can add admin middleware)
router.put('/:orderId/status', authMiddleware, updateOrderStatus);

// Track order by order number and email (public route)
router.post('/track-order', trackOrder);

module.exports = router;