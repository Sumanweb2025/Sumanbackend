const express = require('express');
const router = express.Router();
const {
  getAllCoupons,
  getCouponById,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  toggleCouponStatus,
  getCouponStats
} = require('../Controllers/coupon.controller');

// Admin routes for coupon management
router.get('/all', getAllCoupons);
router.get('/stats', getCouponStats);
router.get('/:id', getCouponById);
router.post('/create', createCoupon);
router.put('/:id', updateCoupon);
router.patch('/:id/toggle-status', toggleCouponStatus);
router.delete('/:id', deleteCoupon);

module.exports = router;
