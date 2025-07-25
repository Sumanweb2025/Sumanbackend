const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler');
const User = require('../Models/user.model');

exports.protect = asyncHandler(async (req, res, next) => {
  // 1. Get token from header
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401);
    throw new Error('Not authorized, no token');
  }

  const token = authHeader.split(' ')[1];

  try {
    // 2. Verify token (works with your existing tokens)
    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY || process.env.JWT_SECRET);
    
    // 3. Get complete user from DB (since your token only has id)
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user) {
      res.status(401);
      throw new Error('User not found');
    }

    // 4. Attach full user info to request
    req.user = {
      id: user._id,
      email: user.email,  // Now we have email!
      name: user.name
    };

    next();
  } catch (error) {
    console.error('Authentication error:', error.message);
    res.status(401);
    throw new Error('Not authorized, token failed');
  }
});