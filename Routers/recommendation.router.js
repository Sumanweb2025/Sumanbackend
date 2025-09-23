const express = require('express');
const router = express.Router();
const {
  trackBehavior,
  getPersonalizedRecommendations,
  getSimilarProducts,
  getFrequentlyBoughtTogether,
  trackRecommendationInteraction,
  getUserBehaviorAnalytics,
  getTrendingProducts
} = require('../Controllers/recommendation.controller');
const { authenticateToken } = require('../Middleware/auth.middleware');

// Track user behavior (requires authentication)
router.post('/track', authenticateToken, trackBehavior);

// Get personalized recommendations (requires authentication)
router.get('/personalized', authenticateToken, getPersonalizedRecommendations);

// Get similar products (public endpoint)
router.get('/similar/:productId', getSimilarProducts);

// Get frequently bought together (public endpoint)
router.get('/frequently-bought-together/:productId', getFrequentlyBoughtTogether);

// Track recommendation interactions (requires authentication)
router.post('/track-interaction', authenticateToken, trackRecommendationInteraction);

// Get user behavior analytics (requires authentication)
router.get('/analytics', authenticateToken, getUserBehaviorAnalytics);

// Get trending products (public endpoint)
router.get('/trending', getTrendingProducts);

module.exports = router;
