const express = require('express');
const router = express.Router();
const {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
  getCartCount
} = require('../Controllers/cart.controller');
const authMiddleware = require('../Middleware/auth.middleware');
const { optionalAuth } = require('../Middleware/auth.middleware');

// Routes that support both guest and logged-in users (use optionalAuth)
router.get('/', optionalAuth, getCart);
router.get('/count', optionalAuth, getCartCount);
router.post('/', optionalAuth, addToCart);
router.put('/:productId', optionalAuth, updateCartItem);
router.delete('/:productId', optionalAuth, removeFromCart);
router.delete('/', optionalAuth, clearCart);

module.exports = router;