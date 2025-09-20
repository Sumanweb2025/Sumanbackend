const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const authController = require('../Controllers/auth.controller');
const authMiddleware = require('../Middleware/auth.middleware'); // Your JWT middleware

// Validation rules
const signupValidation = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  body('phone')
    .optional()
    .matches(/^\d{10}$/)
    .withMessage('Please provide a valid 10-digit phone number')
];

const loginValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

const profileUpdateValidation = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters'),
  body('phone')
    .optional()
    .matches(/^\d{10}$/)
    .withMessage('Please provide a valid 10-digit phone number')
];

// Public routes (no authentication required)
router.post('/signup', signupValidation, authController.signup);
router.post('/login', loginValidation, authController.login);
router.post('/google-auth', authController.googleAuth);

// Protected routes (authentication required)
router.use(authMiddleware); // Apply auth middleware to all routes below

router.get('/profile', authController.getProfile);
router.put('/profile', profileUpdateValidation, authController.updateProfile);

// Profile image routes - DATABASE STORAGE ONLY
router.post('/upload-profile-image', 
  authController.uploadMiddleware, // Multer middleware for memory storage
  authController.uploadProfileImage
);

router.delete('/profile-image', authController.removeProfileImage);

// Test route to check image storage
router.get('/profile-image-info', async (req, res) => {
  try {
    const User = require('../Models/user.model');
    const user = await User.findByIdWithProfileImage(req.user.userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: {
        profileImageInfo: user.profileImageInfo,
        hasBase64Image: !!user.profileImageBase64,
        base64Preview: user.profileImageBase64 ? user.profileImageBase64.substring(0, 100) + '...' : null
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching image info',
      error: error.message
    });
  }
});

// DELETE /api/auth/account - Delete user account
router.delete('/account', authMiddleware, authController.deleteAccount);

module.exports = router;