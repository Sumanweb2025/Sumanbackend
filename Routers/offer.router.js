const express = require('express');
const router = express.Router();
const {
  getActiveOffer,
  getAllOffers,
  getOfferById,
  createOffer,
  updateOffer,
  deleteOffer,
  toggleOfferStatus,
  getOfferStats,
  getProductsByCategory,
  getBrandsByCategory
} = require('../Controllers/offer.controller');

// Public route
router.get('/active', getActiveOffer);

// Admin routes
router.get('/all', getAllOffers);
router.get('/stats', getOfferStats);
router.get('/products-by-category', getProductsByCategory);
router.get('/brands-by-category', getBrandsByCategory);
router.get('/:id', getOfferById);
router.post('/create', createOffer);
router.put('/:id', updateOffer);
router.patch('/:id/toggle-status', toggleOfferStatus);
router.delete('/:id', deleteOffer);

module.exports = router;
