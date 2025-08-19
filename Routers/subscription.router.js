const express = require('express');
const router = express.Router();
const { body, param, query } = require('express-validator');
const subscriptionController = require('../Controllers/subscription.controller');
const authMiddleware = require('../Middleware/auth.middleware');
// const adminMiddleware = require('../Middleware/admin.middleware');

// Validation rules
const subscribeValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name should be between 2-100 characters'),
  
  body('phone')
    .optional()
    .trim()
    .matches(/^[6-9]\d{9}$/)
    .withMessage('Please provide a valid 10-digit mobile number'),
  
  body('subscriptionType')
    .optional()
    .isIn(['newsletter', 'promotional', 'updates', 'all'])
    .withMessage('Invalid subscription type'),
  
  body('source')
    .optional()
    .isIn(['website', 'mobile_app', 'social_media', 'referral', 'other'])
    .withMessage('Invalid source'),
  
  body('preferences')
    .optional()
    .isObject()
    .withMessage('Preferences must be an object'),
  
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array')
];

const updatePreferencesValidation = [
  param('subscriptionId')
    .isMongoId()
    .withMessage('Invalid subscription ID'),
  
  body('preferences')
    .isObject()
    .withMessage('Preferences must be an object'),
  
  body('preferences.emailNotifications')
    .optional()
    .isBoolean()
    .withMessage('Email notifications must be boolean'),
  
  body('preferences.smsNotifications')
    .optional()
    .isBoolean()
    .withMessage('SMS notifications must be boolean'),
  
  body('preferences.promotionalEmails')
    .optional()
    .isBoolean()
    .withMessage('Promotional emails must be boolean'),
  
  body('preferences.weeklyDigest')
    .optional()
    .isBoolean()
    .withMessage('Weekly digest must be boolean')
];

const adminQueryValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1-100'),
  
  query('status')
    .optional()
    .isIn(['all', 'active', 'inactive', 'unsubscribed'])
    .withMessage('Invalid status filter'),
  
  query('userType')
    .optional()
    .isIn(['all', 'registered', 'guest'])
    .withMessage('Invalid user type filter')
];

// Public routes (no authentication required)

/**
 * @route   POST /api/subscription/subscribe
 * @desc    Subscribe to newsletter/updates (for both users and non-users)
 * @access  Public
 * @body    { email, name?, phone?, subscriptionType?, preferences?, source?, tags? }
 */
router.post('/subscribe', subscribeValidation, subscriptionController.subscribe);

/**
 * @route   GET /api/subscription/verify/:token
 * @desc    Verify subscription via email token
 * @access  Public
 * @params  token - verification token from email
 */
router.get('/verify/:token', subscriptionController.verifySubscription);

/**
 * @route   GET /api/subscription/unsubscribe
 * @desc    Unsubscribe from newsletter/updates
 * @access  Public
 * @query   token OR email (one is required)
 */
router.get('/unsubscribe', subscriptionController.unsubscribe);

// Protected routes (authentication required)

/**
 * @route   GET /api/subscription/my-subscriptions
 * @desc    Get current user's subscriptions
 * @access  Private (User)
 */
router.get('/my-subscriptions', authMiddleware, subscriptionController.getUserSubscriptions);

/**
 * @route   PUT /api/subscription/:subscriptionId/preferences
 * @desc    Update subscription preferences
 * @access  Private (User)
 * @params  subscriptionId - ID of the subscription
 * @body    { preferences }
 */
router.put('/:subscriptionId/preferences', 
  authMiddleware, 
  updatePreferencesValidation, 
  subscriptionController.updatePreferences
);

// Admin routes (admin authentication required)

/**
 * @route   GET /api/subscription/admin/all
 * @desc    Get all subscriptions with pagination and filters
 * @access  Private (Admin)
 * @query   page?, limit?, status?, userType?, search?
 */
// router.get('/admin/all', 
//   authMiddleware, 
//   adminMiddleware, 
//   adminQueryValidation, 
//   subscriptionController.getAllSubscriptions
// );

// /**
//  * @route   GET /api/subscription/admin/stats
//  * @desc    Get subscription statistics
//  * @access  Private (Admin)
//  */
// router.get('/admin/stats', 
//   authMiddleware, 
//   adminMiddleware, 
//   subscriptionController.getSubscriptionStats
// );
// ✅ ADD THIS LINE - Export the router
module.exports = router;