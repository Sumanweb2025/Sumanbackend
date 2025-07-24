const express = require('express');
const router = express.Router();
const reviewController = require('../Controllers/Review.controller');
const { protect } = require('../Middleware/auth.middleware');

router.route('/')
  .post(protect, reviewController.createReview);

router.route('/:id')
  .delete(protect, reviewController.deleteReview);

router.route('/products/:productId/reviews')
  .get(reviewController.getProductReviews);

router.route('/products/:productId/rating')
  .get(reviewController.getProductRating);

module.exports = router;