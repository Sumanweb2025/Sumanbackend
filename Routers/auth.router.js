const express = require('express');
const router = express.Router();

// 🔐 Import controller functions
const authController = require('../Controllers/auth.controller');

// 🔒 Import middleware to protect routes
const { protect } = require('../Middleware/auth.middleware');

// 📝 Public routes
router.post('/register', authController.register);
router.post('/login', authController.login);

// 👤 Protected route to get current user info
router.get('/me', protect, authController.getMe);

module.exports = router;
