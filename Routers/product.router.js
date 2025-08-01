const express = require('express');
const router = express.Router();
const productController = require('../Controllers/Product.controller');

// Get all products
router.get('/', productController.getAllProducts);
router.get('/filters', productController.getAvailableFilters); 
// Search products with filters
router.get('/search', productController.searchProducts);

// Get one product by ID
router.get('/:id', productController.getProductById);

// Create product (with image upload)
router.post('/', productController.upload.single('image'), productController.createProduct);

// Update product by ID (with optional image update)
router.put('/:id', productController.upload.single('image'), productController.updateProduct);

// Delete product by ID
router.delete('/:id', productController.deleteProduct);





module.exports = router;