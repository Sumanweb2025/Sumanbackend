const express = require('express');
const router = express.Router();
const orderController = require('../Controllers/order.controller');

router.post('/place-order', orderController.placeOrder);

module.exports = router;
