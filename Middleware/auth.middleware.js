const jwt = require('jsonwebtoken');
const User = require('../Models/user.model');

// Original auth middleware (existing)
const authMiddleware = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'sumanfoods');

    const user = await User.findById(decoded.userId);
    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token or user not found'
      });
    }

    req.user = {
      id: decoded.userId,
      userId: decoded.userId,
      _id: decoded.userId,
      email: user.email,
      name: user.name,
      isGuest: false, // Important: mark as registered user
      ...decoded
    };

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token has expired'
      });
    }

    res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }
};

// NEW: Optional auth middleware (allows both guest and logged-in users)
const optionalAuthMiddleware = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    const sessionId = req.header('X-Session-ID');

    // Check for authenticated user first
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'sumanfoods');

        const user = await User.findById(decoded.userId);
        if (user && user.isActive) {
          req.user = {
            id: decoded.userId,
            userId: decoded.userId,
            _id: decoded.userId,
            email: user.email,
            name: user.name,
            isGuest: false,
            sessionId: null, // ADDED
            ...decoded
          };
          return next();
        }
      } catch (tokenError) {
        console.log('Token verification failed, checking for guest session...');
      }
    }

    // Check for guest session
    if (sessionId) {
      req.user = {
        isGuest: true,
        sessionId: sessionId, // ✅ CRITICAL FIX
        id: null,
        userId: null
      };
      return next();
    }

    // No token and no session = Return error for checkout/payment routes
    return res.status(401).json({
      success: false,
      message: 'Authentication required. Please sign in or continue as guest.'
    });

  } catch (error) {
    console.error('Optional auth middleware error:', error);
    return res.status(401).json({
      success: false,
      message: 'Authentication failed'
    });
  }
};

module.exports = authMiddleware;
module.exports.optionalAuth = optionalAuthMiddleware;