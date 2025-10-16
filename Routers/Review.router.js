
const express = require('express');
const router = express.Router();
const reviewController = require('../Controllers/Review.controller');
const auth = require('../Middleware/auth.middleware');

// Get all reviews for a product (public route)
router.get('/product/:productId', reviewController.getProductReviews);

// Create a review (protected route)
router.post('/product/:productId', auth, reviewController.createReview);

// Get user's review for a specific product (protected route)
router.get('/product/:productId/user', auth, reviewController.getUserReview);

module.exports = router;