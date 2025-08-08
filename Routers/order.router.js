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
  trackOrder
} = require('../Controllers/order.controller');

// Middleware to verify JWT token
const authMiddleware = require('../Middleware/auth.middleware'); // You should have this middleware

// Get checkout data (cart items and totals)
router.get('/checkout', authMiddleware, getCheckoutData);

// Create new order
router.post('/', authMiddleware, createOrder);

// POST /api/orders/apply-coupon - Apply coupon code (NEW)
router.post('/apply-coupon', authMiddleware, applyCoupon);

// GET /api/orders/coupons - Get available coupons (NEW)
router.get('/coupons', authMiddleware, getAvailableCoupons);

// Get user's orders
router.get('/', authMiddleware, getUserOrders);

// Get single order by ID
router.get('/:orderId', authMiddleware, getOrderById);

// Update order status (admin only - you can add admin middleware)
router.put('/:orderId/status', authMiddleware, updateOrderStatus);

// Track order by order number and email (public route)
router.post('/track-order',trackOrder);

module.exports = router;