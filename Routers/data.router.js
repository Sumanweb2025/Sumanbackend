const express = require('express');
const router = express.Router();
const productController = require('../Controllers/data.controller');

router.post('/import', productController.importProducts);
router.get('/', productController.getProducts);

module.exports = router;
