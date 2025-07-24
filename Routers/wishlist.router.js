const express = require('express');
const router = express.Router();
const {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  clearWishlist,
  checkInWishlist
} = require('../Controllers/wishlist.controller');

// GET /wishlist - Get all wishlist items
router.get('/', getWishlist);

// POST /wishlist - Add item to wishlist
// Body: { product_id: "string" }
router.post('/', addToWishlist);

// DELETE /wishlist/:productId - Remove specific item from wishlist
router.delete('/:productId', removeFromWishlist);

// DELETE /wishlist - Clear entire wishlist
router.delete('/', clearWishlist);

// GET /wishlist/check/:productId - Check if product is in wishlist
router.get('/check/:productId', checkInWishlist);

module.exports = router;