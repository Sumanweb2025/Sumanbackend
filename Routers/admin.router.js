const express = require('express');
const router = express.Router();
const adminController = require('../Controllers/admin.controller');
const authMiddleware = require('../Middleware/auth.middleware');
const adminMiddleware = require('../Middleware/admin.middleware');

// Admin Authentication
router.post('/login', adminController.adminLogin);


// Apply auth and admin middleware to all routes
router.use(authMiddleware);
router.use(adminMiddleware);


// Dashboard Overview
router.get('/dashboard/overview', adminController.getDashboardOverview);

// User Management
router.get('/users', adminController.getAllUsers);
router.get('/users/feedback', adminController.getUserFeedback);

// Product Management
router.get('/products/stats', adminController.getProductStats);

// Product CRUD Operations
// If you added methods to admin.controller.js, use adminController
// If you created separate product.controller.js, use productController
router.post('/products', 
  adminController.uploadProductImage, 
  adminController.createProduct
);

router.put('/products/:productId', 
  adminController.uploadProductImage, 
  adminController.updateProduct
);

router.delete('/products/:productId', 
  adminController.deleteProduct
);

// Bulk Import
router.post('/products/bulk-import', 
  adminController.bulkImportProducts
);

// Export (optional - can be handled frontend only)
router.get('/products/export', 
  adminController.exportProducts
);

// Order Management  
router.get('/orders/stats', adminController.getOrderManagementStats);

// Payment Management
router.get('/payments/stats', adminController.getPaymentStats);

// Analytics
router.get('/analytics', adminController.getAnalyticsData);

// Notifications
router.get('/notifications', adminController.getNotifications);

// Admin Profile
router.get('/profile', adminController.getAdminProfile);

module.exports = router;