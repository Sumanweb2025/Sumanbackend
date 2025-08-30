
const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Admin access required'
    });
  }
  next();
};

const requireCustomerOrAdmin = (req, res, next) => {
  if (!req.user || !['customer', 'admin'].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Access denied'
    });
  }
  next();
};

module.exports = {
  requireAdmin,
  requireCustomerOrAdmin
};