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

const authMiddleware = require('../Middleware/auth.middleware');
const { optionalAuth } = require('../Middleware/auth.middleware');
const adminMiddleware = require('../Middleware/admin.middleware');

// CHECKOUT ROUTES - Support guest users
router.get('/checkout', optionalAuth, getCheckoutData);

// COUPON ROUTES - Support guest users
router.post('/apply-coupon', optionalAuth, applyCoupon);

// GET available coupons - Public route
router.get('/coupons', getAvailableCoupons);

// USER ORDER ROUTES - Require authentication
router.get('/', authMiddleware, getUserOrders);
router.get('/:orderId', authMiddleware, getOrderById);
router.put('/:orderId/cancel', authMiddleware, cancelOrder);

// PUBLIC ROUTES
router.post('/track-order', trackOrder);

// ADMIN ROUTES
router.get('/admin/all', authMiddleware, adminMiddleware, getAllOrders);
router.get('/admin/statistics', authMiddleware, adminMiddleware, getOrderStatistics);
router.put('/:orderId/status', authMiddleware, adminMiddleware, updateOrderStatus);

module.exports = router;