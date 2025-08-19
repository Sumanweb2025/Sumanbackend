const express = require('express');
const router = express.Router();
const {
  submitContactForm,
  getAllContacts,
  getContactById,
  replyToContact,
  updateContactStatus,
  deleteContact,
  getContactStats
} = require('../Controllers/contact.controller');

// Middleware for rate limiting (optional)
const rateLimit = require('express-rate-limit');

// Rate limiting for contact form submission
const contactFormLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: {
    success: false,
    message: 'Too many contact form submissions. Please try again after 15 minutes.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Auth middleware (you should implement this based on your auth system)
const requireAuth = (req, res, next) => {
  // Check if user is authenticated
  const token = req.header('Authorization')?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access denied. No token provided.'
    });
  }

  try {
    // Verify token logic here
    // const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }
};

// Admin middleware (check if user is admin)
const requireAdmin = (req, res, next) => {
  // Check if user has admin role
  // if (req.user && req.user.role === 'admin') {
  //   next();
  // } else {
  //   return res.status(403).json({
  //     success: false,
  //     message: 'Access denied. Admin privileges required.'
  //   });
  // }
  next(); // Remove this and uncomment above when you have proper auth
};

// Input validation middleware
const validateContactForm = (req, res, next) => {
  const { name, email, subject, message } = req.body;
  
  // Basic validation
  if (!name || name.trim().length < 2) {
    return res.status(400).json({
      success: false,
      message: 'Name must be at least 2 characters long'
    });
  }
  
  if (!email || !email.includes('@')) {
    return res.status(400).json({
      success: false,
      message: 'Valid email is required'
    });
  }
  
  if (!subject || subject.trim().length < 5) {
    return res.status(400).json({
      success: false,
      message: 'Subject must be at least 5 characters long'
    });
  }
  
  if (!message || message.trim().length < 10) {
    return res.status(400).json({
      success: false,
      message: 'Message must be at least 10 characters long'
    });
  }
  
  next();
};

// PUBLIC ROUTES (No authentication required)

// @route   POST /api/contact
// @desc    Submit contact form
// @access  Public
router.post('/', contactFormLimiter, validateContactForm, submitContactForm);

// ADMIN ROUTES (Authentication required)

// @route   GET /api/contact/admin/all
// @desc    Get all contacts with pagination and filtering
// @access  Admin only
router.get('/admin/all', requireAuth, requireAdmin, getAllContacts);

// @route   GET /api/contact/admin/stats
// @desc    Get contact statistics for admin dashboard
// @access  Admin only
router.get('/admin/stats', requireAuth, requireAdmin, getContactStats);

// @route   GET /api/contact/admin/:id
// @desc    Get single contact by ID
// @access  Admin only
router.get('/admin/:id', requireAuth, requireAdmin, getContactById);

// @route   POST /api/contact/admin/:id/reply
// @desc    Reply to a contact
// @access  Admin only
router.post('/admin/reply/:name', requireAuth, requireAdmin, replyToContact);

// @route   PUT /api/contact/admin/:id/status
// @desc    Update contact status or priority
// @access  Admin only
router.put('/admin/:id/status', requireAuth, requireAdmin, updateContactStatus);

// @route   DELETE /api/contact/admin/:id
// @desc    Delete a contact
// @access  Admin only
router.delete('/admin/:id', requireAuth, requireAdmin, deleteContact);

// Error handling middleware for this router
router.use((error, req, res, next) => {
  console.error('Contact router error:', error);
  res.status(500).json({
    success: false,
    message: 'Internal server error'
  });
});

module.exports = router;