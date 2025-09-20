const User = require('../Models/user.model');
const Order = require('../Models/order.model');
const Product = require('../Models/product.model');
const Payment = require('../Models/payment.model');
const Review = require('../Models/Review.model');
const Refund = require('../Models/refund.model');
const multer = require('multer');
const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

// Admin Authentication
exports.adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log('Admin login attempt for:', email);

    // Input validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    // Find admin user with password field
    const admin = await User.findOne({ 
      email, 
      role: 'admin' 
    }).select('+password');

    console.log('Admin found:', admin ? 'Yes' : 'No');
    
    if (!admin) {
      return res.status(401).json({
        success: false,
        message: 'Invalid admin credentials'
      });
    }

    console.log('Admin details:', {
      email: admin.email,
      role: admin.role,
      authProvider: admin.authProvider,
      hasPassword: !!admin.password,
      isActive: admin.isActive
    });

    // Check if admin is active
    if (!admin.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Admin account is inactive'
      });
    }

    // Compare password
    let isPasswordValid = false;
    if (typeof admin.comparePassword === 'function') {
      isPasswordValid = await admin.comparePassword(password);
    } else {
      isPasswordValid = await bcrypt.compare(password, admin.password);
    }
    
    console.log('Password validation result:', isPasswordValid);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid admin credentials'
      });
    }

    // Update last login
    admin.lastLogin = new Date();
    await admin.save();

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: admin._id, 
        role: admin.role,
        email: admin.email 
      },
      process.env.JWT_SECRET || 'fallback_jwt_secret',
      { expiresIn: '24h' }
    );

    console.log('Login successful for:', admin.email);

    res.status(200).json({
      success: true,
      message: 'Admin login successful',
      data: {
        token,
        admin: {
          id: admin._id,
          name: admin.name,
          email: admin.email,
          role: admin.role,
          lastLogin: admin.lastLogin
        }
      }
    });

  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during admin login',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Dashboard Overview
exports.getDashboardOverview = async (req, res) => {
  try {
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    
    // FIXED: Changed 'user' to 'customer' in user count query
    const [totalOrders, totalUsers, totalProducts, todayOrders] = await Promise.all([
      Order.countDocuments().catch(err => {
        console.error('Error counting orders:', err);
        return 0;
      }),
      User.countDocuments({ role: 'customer' }).catch(err => {
        console.error('Error counting users:', err);
        return 0;
      }),
      Product.countDocuments().catch(err => {
        console.error('Error counting products:', err);
        return 0;
      }),
      Order.countDocuments({ createdAt: { $gte: todayStart } }).catch(err => {
        console.error('Error counting today orders:', err);
        return 0;
      })
    ]);

    // Revenue calculations
    const totalRevenue = await Order.aggregate([
      { $match: { paymentStatus: 'paid' } },
      { $group: { _id: null, total: { $sum: '$orderSummary.total' } } }
    ]).catch(err => {
      console.error('Error calculating total revenue:', err);
      return [{ total: 0 }];
    });

    const todayRevenue = await Order.aggregate([
      { 
        $match: { 
          paymentStatus: 'paid',
          createdAt: { $gte: todayStart }
        }
      },
      { $group: { _id: null, total: { $sum: '$orderSummary.total' } } }
    ]).catch(err => {
      console.error('Error calculating today revenue:', err);
      return [{ total: 0 }];
    });

    const monthlyRevenue = await Order.aggregate([
      {
        $match: {
          paymentStatus: 'paid',
          createdAt: { $gte: monthStart }
        }
      },
      { $group: { _id: null, total: { $sum: '$orderSummary.total' } } }
    ]).catch(err => {
      console.error('Error calculating monthly revenue:', err);
      return [{ total: 0 }];
    });

    // Recent orders
    const recentOrders = await Order.find()
      .populate('userId', 'name email')
      .sort({ createdAt: -1 })
      .limit(5)
      .select('orderNumber status paymentStatus orderSummary.total createdAt')
      .catch(err => {
        console.error('Error fetching recent orders:', err);
        return [];
      });

    // FIXED: Better top products aggregation with proper error handling
   let topProducts = await Review.aggregate([
      {
        $group: {
          _id: '$product_id', // Using product_id string field
          avgRating: { $avg: '$rating' },
          reviewCount: { $sum: 1 }
        }
      },
      { 
        $match: { 
          reviewCount: { $gte: 2 }, // At least 2 reviews for reliability
          avgRating: { $gte: 4.5 }  // Only 4.5+ star products
        }
      },
      { $sort: { avgRating: -1, reviewCount: -1 } },
      { $limit: 5 }
    ]).catch(err => {
      console.error('Error fetching high-rated products:', err);
      return [];
    });

    // Manually populate product information for high-rated products
    const topProductsWithDetails = await Promise.all(
      topProducts.map(async (item) => {
        try {
          const product = await Product.findOne({ product_id: item._id })
            .select('name product_id image price category')
            .catch(err => {
              console.error(`Error finding product ${item._id}:`, err);
              return null;
            });

          if (product) {
            return {
              _id: item._id,
              avgRating: Math.round(item.avgRating * 10) / 10, // Round to 1 decimal
              reviewCount: item.reviewCount,
              product: {
                _id: product._id,
                product_id: product.product_id,
                name: product.name,
                image: product.image,
                price: product.price,
                category: product.category
              }
            };
          }
          return null;
        } catch (err) {
          console.error(`Error processing product ${item._id}:`, err);
          return null;
        }
      })
    );

    // Filter out null results
    const validTopProducts = topProductsWithDetails.filter(item => item !== null);

    // Alternative approach: If no high-rated products exist, show highest rated products (3.5+ stars)
    let alternativeTopProducts = [];
    if (validTopProducts.length === 0) {
      
      const fallbackProducts = await Review.aggregate([
        {
          $group: {
            _id: '$product_id',
            avgRating: { $avg: '$rating' },
            reviewCount: { $sum: 1 }
          }
        },
        { 
          $match: { 
            reviewCount: { $gte: 1 },
            avgRating: { $gte: 3.5 }  // Fallback to 3.5+ stars
          }
        },
        { $sort: { avgRating: -1, reviewCount: -1 } },
        { $limit: 5 }
      ]).catch(err => {
        console.error('Error fetching fallback products:', err);
        return [];
      });

      const fallbackWithDetails = await Promise.all(
        fallbackProducts.map(async (item) => {
          try {
            const product = await Product.findOne({ product_id: item._id })
              .select('name product_id image price category')
              .catch(err => null);

            if (product) {
              return {
                _id: item._id,
                avgRating: Math.round(item.avgRating * 10) / 10,
                reviewCount: item.reviewCount,
                product: {
                  _id: product._id,
                  product_id: product.product_id,
                  name: product.name,
                  image: product.image,
                  price: product.price,
                  category: product.category
                }
              };
            }
            return null;
          } catch (err) {
            return null;
          }
        })
      );

      alternativeTopProducts = fallbackWithDetails.filter(item => item !== null);
    }

    // Final fallback: Latest products if no rated products exist
    let latestProducts = [];
    if (validTopProducts.length === 0 && alternativeTopProducts.length === 0) {
      
      const latest = await Product.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .select('name product_id image price category')
        .catch(err => {
          console.error('Error fetching latest products:', err);
          return [];
        });

      latestProducts = latest.map(product => ({
        _id: product.product_id,
        avgRating: 0,
        reviewCount: 0,
        product: {
          _id: product._id,
          product_id: product.product_id,
          name: product.name,
          image: product.image,
          price: product.price,
          category: product.category
        }
      }));
    }
    // Order status breakdown
    const orderStatus = await Order.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]).catch(err => {
      console.error('Error fetching order status:', err);
      return [];
    });

    const finalTopProducts = topProducts.length > 0 ? topProducts : alternativeTopProducts;

    const dashboardData = {
      stats: {
        totalOrders: totalOrders || 0,
        totalUsers: totalUsers || 0,
        totalProducts: totalProducts || 0,
        todayOrders: todayOrders || 0,
        totalRevenue: (totalRevenue && totalRevenue[0]) ? totalRevenue[0].total : 0,
        todayRevenue: (todayRevenue && todayRevenue[0]) ? todayRevenue[0].total : 0,
        monthlyRevenue: (monthlyRevenue && monthlyRevenue[0]) ? monthlyRevenue[0].total : 0
      },
      recentOrders: recentOrders || [],
      topProducts: finalTopProducts || [],
      orderStatus: orderStatus || []
    };

    res.status(200).json({
      success: true,
      data: dashboardData
    });
  } catch (error) {
    console.error('Dashboard overview error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching dashboard data',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// User Management
exports.getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 10, search } = req.query;
    
    // FIXED: Changed 'user' to 'customer'
    const query = { role: 'customer' };
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await User.countDocuments(query);

    // Get user orders and wishlist count for each user
    const usersWithStats = await Promise.all(
      users.map(async (user) => {
        const orderCount = await Order.countDocuments({ userId: user._id });
        const totalSpent = await Order.aggregate([
          { $match: { userId: user._id, paymentStatus: 'paid' } },
          { $group: { _id: null, total: { $sum: '$orderSummary.total' } } }
        ]);

        return {
          ...user.toObject(),
          orderCount,
          totalSpent: totalSpent[0]?.total || 0,
          wishlistCount: user.wishlist?.length || 0
        };
      })
    );

    res.status(200).json({
      success: true,
      data: {
        users: usersWithStats,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        total
      }
    });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching users'
    });
  }
};

// FIXED: User feedback/reviews with correct field mapping
exports.getUserFeedback = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    // First, get reviews without populating product_id (since it's a string, not ObjectId)
    const reviews = await Review.find()
      .populate('user_id', 'name email') 
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .catch(err => {
        console.error('Error fetching reviews:', err);
        return [];
      });

    const total = await Review.countDocuments().catch(err => {
      console.error('Error counting reviews:', err);
      return 0;
    });

    //console.log('Fetched reviews:', reviews.length, 'Total:', total);

    // Manually populate product information for each review
    const reviewsWithProducts = await Promise.all(
      reviews.map(async (review) => {
        try {
          // Find product using product_id string field
          const product = await Product.findOne({ product_id: review.product_id })
            .select('name product_id image price category')
            .catch(err => {
              console.error(`Error finding product ${review.product_id}:`, err);
              return null;
            });

          return {
            ...review.toObject(),
            product_id: product || { 
              name: 'Product Not Found', 
              product_id: review.product_id 
            }
          };
        } catch (err) {
          console.error(`Error processing review ${review._id}:`, err);
          return {
            ...review.toObject(),
            product_id: { 
              name: 'Error Loading Product', 
              product_id: review.product_id 
            }
          };
        }
      })
    );

   // console.log('Reviews with products processed:', reviewsWithProducts.length);

    res.status(200).json({
      success: true,
      data: {
        reviews: reviewsWithProducts,
        totalPages: Math.ceil(total / limit),
        currentPage: parseInt(page),
        total
      }
    });
  } catch (error) {
    console.error('Get user feedback error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching user feedback',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Product Management Stats
exports.getProductStats = async (req, res) => {
  try {
    const totalProducts = await Product.countDocuments();
    
    // Low stock products (assuming piece < 10 is low stock)
    const lowStockProducts = await Product.find({ piece: { $lt: 10 } })
      .select('name piece category');

    // Category breakdown
    const categoryStats = await Product.aggregate([
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          avgPrice: { $avg: '$price' }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // Brand breakdown
    const brandStats = await Product.aggregate([
      {
        $group: {
          _id: '$brand',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalProducts,
        lowStockProducts,
        categoryStats,
        brandStats
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching product stats'
    });
  }
};

// Order Management Stats
exports.getOrderManagementStats = async (req, res) => {
  try {
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    const totalOrders = await Order.countDocuments();
    const todayOrders = await Order.countDocuments({ 
      createdAt: { $gte: todayStart } 
    });
    const cancelledOrders = await Order.countDocuments({ status: 'cancelled' });
    const pendingOrders = await Order.countDocuments({ status: 'pending' });

    // Recent orders with full details
    const recentOrdersDetails = await Order.find()
      .populate('userId', 'name email')
      .populate({
        path: 'items.productId',
        select: 'name image price'
      })
      .sort({ createdAt: -1 })
      .limit(10);

    res.status(200).json({
      success: true,
      data: {
        totalOrders,
        todayOrders,
        cancelledOrders,
        pendingOrders,
        recentOrdersDetails
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching order management stats'
    });
  }
};

// Payment Management Stats
exports.getPaymentStats = async (req, res) => {
  try {
    // Payment method breakdown
    const paymentMethodStats = await Order.aggregate([
      {
        $group: {
          _id: '$paymentMethod',
          count: { $sum: 1 },
          revenue: { $sum: '$orderSummary.total' }
        }
      }
    ]);

    // Recent payments
    const recentPayments = await Payment.find()
      .populate({
        path: 'orderId',
        populate: {
          path: 'userId',
          select: 'name email'
        }
      })
      .sort({ createdAt: -1 })
      .limit(10);

    // Refund details
    const refundStats = await Refund.find()
      .populate({
        path: 'orderId',
        populate: {
          path: 'userId',
          select: 'name email'
        }
      })
      .sort({ createdAt: -1 })
      .limit(10);

    // Total refunded amount
    const totalRefunded = await Refund.aggregate([
      { $match: { refundStatus: 'completed' } },
      { $group: { _id: null, total: { $sum: '$refundAmount' } } }
    ]);

    res.status(200).json({
      success: true,
      data: {
        paymentMethodStats,
        recentPayments,
        refundStats,
        totalRefunded: totalRefunded[0]?.total || 0
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching payment stats'
    });
  }
};

// Analytics - Revenue and Sales Charts Data
exports.getAnalyticsData = async (req, res) => {
  try {
    const { period = '30d' } = req.query;
    
    let startDate = new Date();
    let groupBy;
    
    switch (period) {
      case '7d':
        startDate.setDate(startDate.getDate() - 7);
        groupBy = {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
          day: { $dayOfMonth: '$createdAt' }
        };
        break;
      case '30d':
        startDate.setDate(startDate.getDate() - 30);
        groupBy = {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
          day: { $dayOfMonth: '$createdAt' }
        };
        break;
      case '3m':
        startDate.setMonth(startDate.getMonth() - 3);
        groupBy = {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' }
        };
        break;
      case '1y':
        startDate.setFullYear(startDate.getFullYear() - 1);
        groupBy = {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' }
        };
        break;
    }

    // Revenue over time
    const revenueData = await Order.aggregate([
      {
        $match: {
          paymentStatus: 'paid',
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: groupBy,
          revenue: { $sum: '$orderSummary.total' },
          orderCount: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
    ]);

    // Sales data (order count over time)
    const salesData = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: groupBy,
          orders: { $sum: 1 },
          revenue: { $sum: '$orderSummary.total' }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
    ]);

    // Top selling products
    const topSellingProducts = await Order.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.productId',
          totalSold: { $sum: '$items.quantity' },
          revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } }
        }
      },
      { $sort: { totalSold: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'product'
        }
      },
      { $unwind: '$product' }
    ]);

    res.status(200).json({
      success: true,
      data: {
        revenueData,
        salesData,
        topSellingProducts,
        period
      }
    });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching analytics data'
    });
  }
};

// Get Recent Notifications
exports.getNotifications = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Recent orders (today)
    const newOrders = await Order.find({
      createdAt: { $gte: today }
    }).populate('userId', 'name').limit(5);

    // Recent payments
    const newPayments = await Payment.find({
      createdAt: { $gte: today }
    }).populate({
      path: 'orderId',
      populate: { path: 'userId', select: 'name' }
    }).limit(5);

    // Recent cancellations
    const cancelledOrders = await Order.find({
      status: 'cancelled',
      cancelledAt: { $gte: today }
    }).populate('userId', 'name').limit(5);

    // Recent refunds
    const newRefunds = await Refund.find({
      createdAt: { $gte: today }
    }).populate({
      path: 'orderId',
      populate: { path: 'userId', select: 'name' }
    }).limit(5);

    // Low stock alerts
    const lowStockProducts = await Product.find({
      piece: { $lt: 10 }
    }).select('name piece').limit(5);

    const notifications = [
      ...newOrders.map(order => ({
        type: 'new_order',
        title: 'New Order Received',
        message: `Order ${order.orderNumber} from ${order.userId?.name}`,
        time: order.createdAt,
        orderId: order._id
      })),
      ...newPayments.map(payment => ({
        type: 'payment',
        title: 'Payment Received',
        message: `Payment of $${payment.amount} from ${payment.orderId?.userId?.name}`,
        time: payment.createdAt,
        orderId: payment.orderId?._id
      })),
      ...cancelledOrders.map(order => ({
        type: 'cancellation',
        title: 'Order Cancelled',
        message: `Order ${order.orderNumber} cancelled by ${order.userId?.name}`,
        time: order.cancelledAt,
        orderId: order._id
      })),
      ...newRefunds.map(refund => ({
        type: 'refund',
        title: 'Refund Initiated',
        message: `Refund of $${refund.refundAmount} for order ${refund.orderNumber}`,
        time: refund.createdAt,
        orderId: refund.orderId
      })),
      ...lowStockProducts.map(product => ({
        type: 'low_stock',
        title: 'Low Stock Alert',
        message: `${product.name} - Only ${product.piece} left`,
        time: new Date(),
        productId: product._id
      }))
    ];

    // Sort by time (newest first)
    notifications.sort((a, b) => new Date(b.time) - new Date(a.time));

    res.status(200).json({
      success: true,
      data: notifications.slice(0, 20) // Limit to 20 notifications
    });
  } catch (error) {
    console.error('Notifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching notifications'
    });
  }
};

// Admin Profile
exports.getAdminProfile = async (req, res) => {
  try {
    const admin = await User.findById(req.user.userId).select('-password');
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found'
      });
    }

    res.status(200).json({
      success: true,
      data: admin
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching admin profile'
    });
  }
};

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/products/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'product-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Generate unique product ID
const generateProductId = () => {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.random().toString(36).substr(2, 4).toUpperCase();
  return `PRD${timestamp}${random}`;
};

// Create Product
exports.createProduct = async (req, res) => {
  try {
    const {
      name,
      product_id,
      brand,
      category,
      price,
      piece,
      description,
      ingredients,
      storage_condition,
      gram
    } = req.body;

    // Validate required fields
    if (!name || !brand || !category || !price || !piece || !description || !gram) {
      return res.status(400).json({
        success: false,
        message: 'Required fields are missing: name, brand, category, price, piece, description, gram'
      });
    }

    // Generate product_id if not provided
    const finalProductId = product_id || generateProductId();

    // Check if product_id already exists
    const existingProduct = await Product.findOne({ product_id: finalProductId });
    if (existingProduct) {
      return res.status(400).json({
        success: false,
        message: 'Product ID already exists'
      });
    }

    // Handle image upload
    let imageUrl = null;
    if (req.file) {
      imageUrl = `/uploads/products/${req.file.filename}`;
    }

    // Create product data
    const productData = {
      name,
      product_id: finalProductId,
      brand,
      category,
      price: parseFloat(price),
      piece: parseInt(piece),
      description,
      ingredients: ingredients || '',
      storage_condition: storage_condition || '',
      gram: parseFloat(gram),
      imageUrl,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const newProduct = new Product(productData);
    const savedProduct = await newProduct.save();

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: savedProduct
    });

  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating product',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Middleware export for multer
exports.uploadProductImage = upload.single('image');

// Delete Product
exports.deleteProduct = async (req, res) => {
  try {
    const { productId } = req.params;

    const deletedProduct = await Product.findOneAndDelete({ product_id: productId });
    
    if (!deletedProduct) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Product deleted successfully',
      data: deletedProduct
    });

  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting product',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Bulk Import Products
exports.bulkImportProducts = async (req, res) => {
  try {
    const { products } = req.body;
    
    
    if (!products || !Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'No products provided for import' 
      });
    }

    const importResults = [];
    const errors = [];
    const skipped = [];

    for (let i = 0; i < products.length; i++) {
      const productData = products[i];
      
      try {
        // Validate required fields
        if (!productData.name || !productData.price || !productData.piece) {
          skipped.push({ 
            row: i + 1, 
            reason: 'Missing required fields (name, price, piece)',
            data: productData 
          });
          continue;
        }

        // Generate product_id if not provided
        const finalProductId = productData.product_id || generateProductId();

        // Check if product already exists
        const existingProduct = await Product.findOne({ product_id: finalProductId });
        if (existingProduct) {
          skipped.push({ row: i + 1, product_id: finalProductId, reason: 'Product ID already exists' });
          continue;
        }

        // Prepare product data
        const newProductData = {
          name: productData.name,
          product_id: finalProductId,
          brand: productData.brand || 'Unknown',
          category: productData.category || 'General',
          price: parseFloat(productData.price) || 0,
          piece: parseInt(productData.piece) || 0,
          description: productData.description || productData.name,
          ingredients: productData.ingredients || '',
          storage_condition: productData.storage_condition || '',
          gram: productData.gram || 0,
          rating: productData.rating || 0,
          sub_category: productData.sub_category || '',
          image: productData.image || 'default-product.jpg', // Default image for bulk imports
          createdAt: new Date(),
          updatedAt: new Date()
        };

        // Create and save product
        const newProduct = new Product(newProductData);
        const savedProduct = await newProduct.save();
        importResults.push(savedProduct);

      } catch (error) {
        errors.push({
          row: i + 1,
          error: error.message,
          data: productData
        });
      }
    }

    // Return results
    
    const response = {
      success: true,
      message: `Import completed. ${importResults.length} products imported successfully.`,
      data: {
        imported: importResults.length,
        errors: errors.length,
        skipped: skipped.length,
        total: products.length,
        importedProducts: importResults,
        errorDetails: errors,
        skippedDetails: skipped
      }
    };

    if (errors.length > 0) {
      response.errors = errors;
    }

    if (skipped.length > 0) {
      response.skipped = skipped;
    }

    res.status(200).json(response);

  } catch (error) {
    console.error('Bulk import error:', error);
    res.status(500).json({
      success: false,
      message: 'Error during bulk import',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get All Products
exports.getAllProducts = async (req, res) => {
  try {
    const { page = 1, limit = 50, category, brand, search, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

    // Build query
    const query = {};
    
    if (category) query.category = category;
    if (brand) query.brand = brand;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { product_id: { $regex: search, $options: 'i' } }
      ];
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Execute query
    const products = await Product.find(query)
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    const total = await Product.countDocuments(query);

    res.status(200).json({
      success: true,
      data: products,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalProducts: total,
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    });

  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching products',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Export - this method is handled on frontend, but you can create a backend endpoint if needed
exports.exportProducts = async (req, res) => {
  try {
    const { format = 'csv' } = req.query;
    
    const products = await Product.find()
      .select('-_id -__v -createdAt -updatedAt')
      .lean();

    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename=products_${new Date().toISOString().split('T')[0]}.json`);
      return res.json(products);
    }

    // CSV format
    if (products.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No products found'
      });
    }

    const headers = Object.keys(products[0]).join(',');
    const csvData = products.map(product => 
      Object.values(product).map(value => 
        `"${String(value).replace(/"/g, '""')}"`
      ).join(',')
    ).join('\n');

    const csvContent = headers + '\n' + csvData;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=products_${new Date().toISOString().split('T')[0]}.csv`);
    res.send(csvContent);

  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({
      success: false,
      message: 'Error exporting products',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
// Update Product
exports.updateProduct = async (req, res) => {
  try {
    const { productId } = req.params;
    const updateData = { ...req.body };

    // Find existing product
    const existingProduct = await Product.findOne({ product_id: productId });
    if (!existingProduct) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Handle image upload
    if (req.file) {
      updateData.imageUrl = `/uploads/products/${req.file.filename}`;
    }

    // Convert numeric fields
    if (updateData.price) updateData.price = parseFloat(updateData.price);
    if (updateData.piece) updateData.piece = parseInt(updateData.piece);
    if (updateData.gram) updateData.gram = parseFloat(updateData.gram);

    updateData.updatedAt = new Date();

    // Update product
    const updatedProduct = await Product.findOneAndUpdate(
      { product_id: productId },
      updateData,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: 'Product updated successfully',
      data: updatedProduct
    });

  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating product',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
// Download Order PDF (Invoice/Bill)
exports.downloadOrderPDF = async (req, res) => {
  try {
    const { orderId, type } = req.params;
    
    // Find the order
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Get order items
    const orderItems = order.items || order.orderItems || order.products || [];

    let pdfBuffer;
    let filename;

    // Generate PDF based on type
    if (type === 'invoice') {
      pdfBuffer = await PDFGeneratorService.generateInvoicePDFBuffer(order, orderItems);
      filename = `Invoice-${order.orderNumber}.pdf`;
    } else if (type === 'bill') {
      pdfBuffer = await PDFGeneratorService.generateBillPDFBuffer(order, orderItems);
      filename = `Bill-${order.orderNumber}.pdf`;
    } else {
      return res.status(400).json({ message: 'Invalid PDF type. Use "invoice" or "bill"' });
    }

    // Set headers for PDF response
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(pdfBuffer);

  } catch (error) {
    console.error('Error downloading order PDF:', error);
    res.status(500).json({ message: 'Error generating PDF', error: error.message });
  }
};