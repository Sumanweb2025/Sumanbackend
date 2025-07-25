const express = require('express');
const router = express.Router();
const {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
  getCartTotal
} = require('../Controllers/cart.controller');

// Get cart
router.get('/', getCart);

// Add item to cart
router.post('/add', addToCart);

// Update cart item quantity
router.put('/item/:productId', updateCartItem);

// Remove item from cart
router.delete('/item/:productId', removeFromCart);

// Clear entire cart
router.delete('/clear', clearCart);

// Get cart total and item count
router.get('/total', getCartTotal);

module.exports = router;