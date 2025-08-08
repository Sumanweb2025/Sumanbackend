const express = require('express');
const { body } = require('express-validator');
const authController = require('../Controllers/auth.controller');
const authMiddleware = require('../Middleware/auth.middleware');

const router = express.Router();

// Validation rules
const signupValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters'),
  
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please enter a valid email'),
  
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
    .matches(/^(?=.*[A-Za-z])(?=.*\d)/)
    .withMessage('Password must contain at least one letter and one number'),
  
  body('phone')
    .optional()
    .isMobilePhone('en-IN')
    .withMessage('Please enter a valid Indian phone number')
];

const loginValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please enter a valid email'),
  
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

const googleAuthValidation = [
  body('credential')
    .notEmpty()
    .withMessage('Google credential is required')
];

const updateProfileValidation = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters'),
  
  body('phone')
    .optional()
    .isMobilePhone('en-IN')
    .withMessage('Please enter a valid Indian phone number')
];

// Routes
router.post('/signup', signupValidation, authController.signup);
router.post('/login', loginValidation, authController.login);
router.post('/google-auth', googleAuthValidation, authController.googleAuth);
router.get('/profile', authMiddleware, authController.getProfile);
router.put('/profile', authMiddleware, updateProfileValidation, authController.updateProfile);

module.exports = router;