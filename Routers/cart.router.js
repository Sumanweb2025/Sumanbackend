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
const  authMiddleware  = require('../Middleware/auth.middleware'); // Assuming you have auth middleware

// All routes require authentication
router.use(authMiddleware);

// GET /api/cart - Get user's cart
router.get('/', getCart);

// GET /api/cart/count - Get cart items count
router.get('/count', getCartCount);

// POST /api/cart - Add product to cart
router.post('/', addToCart);

// PUT /api/cart/:productId - Update cart item quantity
router.put('/:productId', updateCartItem);

// DELETE /api/cart/:productId - Remove specific product from cart
router.delete('/:productId', removeFromCart);

// DELETE /api/cart - Clear entire cart
router.delete('/', clearCart);

module.exports = router;