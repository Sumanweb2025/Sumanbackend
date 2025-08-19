const Subscription = require('../Models/subscription.model');
const User = require('../Models/user.model');
const { validationResult } = require('express-validator');
const crypto = require('crypto');

// Helper function to get client IP
const getClientIP = (req) => {
  return req.ip || req.connection.remoteAddress || req.socket.remoteAddress || null;
};

// Helper function to send verification email (implement based on your email service)
const sendVerificationEmail = async (subscription) => {
  // TODO: Implement email sending logic
  // Example implementation:
  // const emailService = require('../services/emailService');
  // await emailService.sendVerificationEmail({
  //   to: subscription.email,
  //   verificationLink: `${process.env.FRONTEND_URL}/verify-subscription/${subscription.verificationToken}`
  // });
};

// Helper function to send welcome email
const sendWelcomeEmail = async (subscription) => {
  // TODO: Implement welcome email logic
};

// Subscribe - For both users and non-users
exports.subscribe = async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { 
      email, 
      name, 
      phone, 
      subscriptionType = 'newsletter',
      preferences = {},
      source = 'website',
      tags = []
    } = req.body;

    // Check if already subscribed
    const existingSubscription = await Subscription.findByEmail(email);
    if (existingSubscription) {
      if (existingSubscription.status === 'active') {
        return res.status(409).json({
          success: false,
          message: 'Email is already subscribed',
          data: {
            subscription: existingSubscription,
            isVerified: existingSubscription.isVerified
          }
        });
      } else if (existingSubscription.status === 'unsubscribed') {
        // Reactivate subscription
        await existingSubscription.resubscribe();
        
        return res.status(200).json({
          success: true,
          message: 'Successfully resubscribed!',
          data: {
            subscription: existingSubscription,
            action: 'resubscribed'
          }
        });
      }
    }

    // Check if this is a registered user
    let userId = null;
    const registeredUser = await User.findOne({ email: email.toLowerCase() });
    if (registeredUser) {
      userId = registeredUser._id;
    }

    // Create new subscription
    const subscription = new Subscription({
      email: email.toLowerCase(),
      userId: userId,
      name: name || registeredUser?.name,
      phone: phone || registeredUser?.phone,
      subscriptionType,
      preferences: {
        emailNotifications: true,
        smsNotifications: false,
        promotionalEmails: true,
        weeklyDigest: false,
        ...preferences
      },
      source,
      tags: Array.isArray(tags) ? tags : [],
      ipAddress: getClientIP(req),
      userAgent: req.get('User-Agent'),
      userType: userId ? 'registered' : 'guest'
    });

    await subscription.save();

    // Send verification email
    try {
      await sendVerificationEmail(subscription);
    } catch (emailError) {
      // Don't fail the subscription if email fails
    }

    res.status(201).json({
      success: true,
      message: 'Successfully subscribed! Please check your email to verify your subscription.',
      data: {
        subscription: {
          id: subscription._id,
          email: subscription.email,
          subscriptionType: subscription.subscriptionType,
          userType: subscription.userType,
          isVerified: subscription.isVerified,
          subscribedAt: subscription.subscribedAt
        }
      }
    });

  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'Email is already subscribed to this subscription type'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error during subscription'
    });
  }
};

// Verify subscription
exports.verifySubscription = async (req, res) => {
  try {
    const { token } = req.params;

    const subscription = await Subscription.findOne({
      verificationToken: token,
      verificationTokenExpires: { $gt: Date.now() }
    });

    if (!subscription) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired verification token'
      });
    }

    await subscription.verify();

    // Send welcome email
    try {
      await sendWelcomeEmail(subscription);
    } catch (emailError) {
      // Continue even if welcome email fails
    }

    res.status(200).json({
      success: true,
      message: 'Subscription verified successfully!',
      data: {
        subscription: {
          email: subscription.email,
          isVerified: subscription.isVerified,
          verifiedAt: new Date()
        }
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error during verification'
    });
  }
};

// Unsubscribe
exports.unsubscribe = async (req, res) => {
  try {
    const { token, email } = req.query;

    let subscription;
    
    if (token) {
      // Unsubscribe via token (from email link)
      subscription = await Subscription.findOne({
        unsubscribeToken: token
      });
    } else if (email) {
      // Unsubscribe via email
      subscription = await Subscription.findByEmail(email);
    } else {
      return res.status(400).json({
        success: false,
        message: 'Either token or email is required'
      });
    }

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found'
      });
    }

    if (subscription.status === 'unsubscribed') {
      return res.status(400).json({
        success: false,
        message: 'Already unsubscribed'
      });
    }

    await subscription.unsubscribe();

    res.status(200).json({
      success: true,
      message: 'Successfully unsubscribed',
      data: {
        email: subscription.email,
        unsubscribedAt: subscription.unsubscribedAt
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error during unsubscription'
    });
  }
};

// Get user's subscriptions (for authenticated users)
exports.getUserSubscriptions = async (req, res) => {
  try {
    const userId = req.user.userId;

    const subscriptions = await Subscription.find({
      userId: userId,
      status: { $ne: 'unsubscribed' }
    });

    res.status(200).json({
      success: true,
      message: 'User subscriptions retrieved successfully',
      data: {
        subscriptions: subscriptions,
        count: subscriptions.length
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error while fetching subscriptions'
    });
  }
};

// Update subscription preferences (for authenticated users)
exports.updatePreferences = async (req, res) => {
  try {
    const { subscriptionId } = req.params;
    const { preferences } = req.body;
    const userId = req.user.userId;

    const subscription = await Subscription.findOne({
      _id: subscriptionId,
      userId: userId
    });

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found or not authorized'
      });
    }

    await subscription.updatePreferences(preferences);

    res.status(200).json({
      success: true,
      message: 'Preferences updated successfully',
      data: {
        subscription: subscription
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error while updating preferences'
    });
  }
};

// Admin: Get all subscriptions
exports.getAllSubscriptions = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      status = 'all', 
      userType = 'all',
      search = ''
    } = req.query;

    // Build filter
    const filter = {};
    if (status !== 'all') {
      filter.status = status;
    }
    if (userType !== 'all') {
      filter.userType = userType;
    }
    if (search) {
      filter.$or = [
        { email: { $regex: search, $options: 'i' } },
        { name: { $regex: search, $options: 'i' } }
      ];
    }

    // Execute query with pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const subscriptions = await Subscription.find(filter)
      .populate('userId', 'name email')
      .sort({ subscribedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Subscription.countDocuments(filter);

    // Get statistics
    const stats = await Subscription.getSubscriptionStats();

    res.status(200).json({
      success: true,
      message: 'Subscriptions retrieved successfully',
      data: {
        subscriptions,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalItems: total,
          itemsPerPage: parseInt(limit)
        },
        stats
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error while fetching subscriptions'
    });
  }
};

// Admin: Get subscription statistics
exports.getSubscriptionStats = async (req, res) => {
  try {
    const stats = await Subscription.getSubscriptionStats();
    
    // Additional stats by subscription type
    const typeStats = await Subscription.aggregate([
      {
        $group: {
          _id: '$subscriptionType',
          count: { $sum: 1 },
          active: { 
            $sum: { 
              $cond: [{ $eq: ['$status', 'active'] }, 1, 0] 
            } 
          }
        }
      }
    ]);

    // Monthly subscription trends (last 12 months)
    const monthlyStats = await Subscription.aggregate([
      {
        $match: {
          subscribedAt: {
            $gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)
          }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$subscribedAt' },
            month: { $month: '$subscribedAt' }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.year': -1, '_id.month': -1 }
      }
    ]);

    res.status(200).json({
      success: true,
      message: 'Statistics retrieved successfully',
      data: {
        overview: stats,
        byType: typeStats,
        monthly: monthlyStats
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error while fetching statistics'
    });
  }
};