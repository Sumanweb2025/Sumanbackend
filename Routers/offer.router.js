const express = require('express');
const router = express.Router();
const {
  getActiveOffer,
  createOffer,
  deleteOffer
} = require('../Controllers/offer.controller');

router.get('/active', getActiveOffer);
router.post('/create', createOffer);
router.delete('/:id', deleteOffer);

module.exports = router;
