const express = require('express');
const router = express.Router();
const {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  clearWishlist
} = require('../Controllers/wishlist.controller');
const { optionalAuth } = require('../Middleware/auth.middleware');

// Routes that support both guest and logged-in users
router.get('/', optionalAuth, getWishlist);
router.post('/', optionalAuth, addToWishlist);
router.delete('/:productId', optionalAuth, removeFromWishlist);
router.delete('/', optionalAuth, clearWishlist);

module.exports = router;