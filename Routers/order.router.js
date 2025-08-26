const express = require('express');
const router = express.Router();
const {
  getCheckoutData,
  getUserOrders,
  getOrderById,
  updateOrderStatus,
  applyCoupon,
  getAvailableCoupons,
  trackOrder,
  getAllOrders,
  getOrderStatistics,
  cancelOrder
} = require('../Controllers/order.controller');

// Middleware to verify JWT token
const authMiddleware = require('../Middleware/auth.middleware');
// Admin middleware (you'll need to create this if not exists)
const adminMiddleware = require('../Middleware/admin.middleware');

// CHECKOUT ROUTES
// GET /api/orders/checkout - Get checkout data (cart items and totals)
router.get('/checkout', authMiddleware, getCheckoutData);

// COUPON ROUTES
// POST /api/orders/apply-coupon - Apply coupon code
router.post('/apply-coupon', authMiddleware, applyCoupon);

// GET /api/orders/coupons - Get available coupons
router.get('/coupons', authMiddleware, getAvailableCoupons);

// USER ORDER ROUTES
// GET /api/orders - Get user's orders
router.get('/', authMiddleware, getUserOrders);

// GET /api/orders/:orderId - Get single order by ID
router.get('/:orderId', authMiddleware, getOrderById);

// PUT /api/orders/:orderId/cancel - Cancel order (user only) - UPDATED TO ACCEPT REASON IN BODY
router.put('/:orderId/cancel', authMiddleware, cancelOrder);

// PUBLIC ROUTES
// POST /api/orders/track-order - Track order by order number and email (public route)
router.post('/track-order', trackOrder);

// ADMIN ROUTES
// GET /api/orders/admin/all - Get all orders (admin only)
router.get('/admin/all', authMiddleware, adminMiddleware, getAllOrders);

// GET /api/orders/admin/statistics - Get order statistics (admin only)
router.get('/admin/statistics', authMiddleware, adminMiddleware, getOrderStatistics);

// PUT /api/orders/:orderId/status - Update order status (admin only)
router.put('/:orderId/status', authMiddleware, adminMiddleware, updateOrderStatus);

module.exports = router;