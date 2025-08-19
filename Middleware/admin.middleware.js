const User = require('../Models/user.model'); 

const adminMiddleware = async (req, res, next) => {
  try {
    // Assuming req.user is set by the auth middleware
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Fetch the user to check admin status
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if user is admin (adjust field name as per your user model)
    // Common field names: isAdmin, role, userType
    if (!user.isAdmin && user.role !== 'admin' && user.userType !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    // User is admin, continue to the next middleware/route handler
    next();
  } catch (error) {
    console.error('Admin middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

module.exports = adminMiddleware;