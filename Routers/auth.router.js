const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const rateLimit = require('express-rate-limit');
const authController = require('../Controllers/auth.controller');
const authMiddleware = require('../Middleware/auth.middleware');

// Rate limiting configurations
const generalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per IP per 15 minutes
  message: { success: false, message: 'Too many requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 auth attempts per IP per 15 minutes
  message: { success: false, message: 'Too many authentication attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Enhanced validation rules with security
const signupValidation = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('Name can only contain letters and spaces'),

  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email')
    .isLength({ max: 100 })
    .withMessage('Email too long'),

  body('password')
    .isLength({ min: 6, max: 128 })
    .withMessage('Password must be between 6 and 128 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),

  body('phone')
    .notEmpty()
    .withMessage('Phone number is required')
    .matches(/^\d{10}$/)
    .withMessage('Please provide a valid 10-digit phone number')
    .custom((value) => {
      // Additional phone validation - check if it starts with valid Indian mobile prefixes
      const validPrefixes = ['6', '7', '8', '9'];
      if (!validPrefixes.includes(value[0])) {
        throw new Error('Phone number must start with 6, 7, 8, or 9');
      }
      return true;
    })
];

const loginValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email')
    .isLength({ max: 100 })
    .withMessage('Email too long'),

  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ max: 128 })
    .withMessage('Password too long')
];

const otpVerificationValidation = [
  body('tempUserId')
    .notEmpty()
    .withMessage('Temp user ID is required')
    .isUUID(4)
    .withMessage('Invalid session format'),

  body('otp')
    .isLength({ min: 6, max: 6 })
    .withMessage('OTP must be exactly 6 digits')
    .matches(/^\d{6}$/)
    .withMessage('OTP must contain only digits')
    .custom((value) => {
      // Prevent common weak OTPs
      const weakOTPs = ['000000', '111111', '222222', '333333', '444444', '555555', '666666', '777777', '888888', '999999', '123456', '654321'];
      if (weakOTPs.includes(value)) {
        throw new Error('Invalid OTP format');
      }
      return true;
    }),

  body('phone')
    .matches(/^\d{10}$/)
    .withMessage('Please provide a valid 10-digit phone number')
];

const resendOtpValidation = [
  body('tempUserId')
    .notEmpty()
    .withMessage('Temp user ID is required')
    .isUUID(4)
    .withMessage('Invalid session format'),

  body('phone')
    .matches(/^\d{10}$/)
    .withMessage('Please provide a valid 10-digit phone number')
];

const profileUpdateValidation = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('Name can only contain letters and spaces'),

  body('phone')
    .optional()
    .matches(/^\d{10}$/)
    .withMessage('Please provide a valid 10-digit phone number'),

  body('address.street')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Street address too long'),

  body('address.city')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('City name too long'),

  body('address.state')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('State name too long'),

  body('address.pincode')
    .optional()
    .matches(/^\d{6}$/)
    .withMessage('Please provide a valid 6-digit pincode')
];

// Password reset routes (public)
router.post('/forgot-password',
  authRateLimit,
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  authController.forgotPassword
);

router.post('/reset-password',
  authRateLimit,
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('token')
    .notEmpty()
    .withMessage('Reset token is required'),
  body('newPassword')
    .isLength({ min: 6, max: 128 })
    .withMessage('Password must be between 6 and 128 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  authController.resetPassword
);

// Apply general rate limiting to all routes
router.use(generalRateLimit);

// Public routes (no authentication required)
router.post('/signup',
  signupValidation,
  authController.signup
);

router.post('/verify-otp',
  otpVerificationValidation,
  authController.verifyOtp
);

router.post('/resend-otp',
  resendOtpValidation,
  authController.resendOtp
);

router.post('/login',
  authRateLimit,
  loginValidation,
  authController.login
);

router.post('/google-auth',
  authRateLimit,
  authController.googleAuth
);

// Protected routes (authentication required)
router.use(authMiddleware);

router.get('/profile', authController.getProfile);

router.put('/profile',
  profileUpdateValidation,
  authController.updateProfile
);

// Profile image routes
router.post('/upload-profile-image',
  authController.uploadMiddleware,
  authController.uploadProfileImage
);

router.delete('/remove-profile-image',
  authController.removeProfileImage
);

router.delete('/profile-image', authController.removeProfileImage);

// Account management
router.delete('/account', authController.deleteAccount);

// Admin/Debug routes (add proper admin middleware in production)
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
        base64Preview: user.profileImageBase64 ?
          user.profileImageBase64.substring(0, 50) + '...[truncated]' : null
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

// Health check route
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Auth service is running',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;