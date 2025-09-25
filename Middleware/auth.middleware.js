const jwt = require('jsonwebtoken');
const User = require('../Models/user.model');

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
    
    //console.log('Decoded token:', decoded); 
    
    const user = await User.findById(decoded.userId);
    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token or user not found'
      });
    }

    // Attach both decoded token and user details to req.user
    req.user = {
      id: decoded.userId,        // Make sure id is available
      userId: decoded.userId,    // Alternative access
      _id: decoded.userId,       // Another alternative
      email: user.email,
      name: user.name,
      ...decoded                 // Include all token data
    };

    //console.log('Attached user to req:', req.user);
    
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token has expired'
      });
    }
    
    console.error('Auth middleware error:', error); // Debug log
    
    res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }
};

module.exports = authMiddleware;