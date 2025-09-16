const User = require('../Models/user.model');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const { OAuth2Client } = require('google-auth-library');
const multer = require('multer');

// Initialize Google OAuth client
const googleClient = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET
);

// Configure multer for memory storage (DATABASE ONLY - NO FILE STORAGE)
const storage = multer.memoryStorage();

// File filter for images only
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, GIF and WebP images are allowed.'), false);
  }
};

// Multer upload configuration - Memory storage only
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: fileFilter
});

// Generate JWT Token
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET || 'your_jwt_secret', {
    expiresIn: '7d'
  });
};

// Helper function to format user data consistently
const formatUserData = (user) => {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    address: user.address,
    role: user.role,
    lastLogin: user.lastLogin,
    authProvider: user.authProvider,
    profileImage: user.displayImage, // Use virtual field that handles priority
    picture: user.picture,
    googleProfileImage: user.googleProfileImage,
    profileImageInfo: user.profileImageInfo, // Include image metadata
    emailVerified: user.emailVerified,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    wishlist: user.wishlist,
    cart: user.cart
  };
};

// User Signup
exports.signup = async (req, res) => {
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

    const { name, email, password, phone, address } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email'
      });
    }

    // Create new user
    const user = new User({
      name,
      email,
      password,
      phone,
      address,
      authProvider: 'local'
    });

    await user.save();

    // Generate token
    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: formatUserData(user),
        token
      }
    });

  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during registration'
    });
  }
};

// User Login
exports.login = async (req, res) => {
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

    const { email, password } = req.body;

    // Find user and include password field and profile image
    const user = await User.findOne({ email }).select('+password +profileImageBase64');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account has been deactivated'
      });
    }

    // Check if user signed up with Google
    if (user.authProvider === 'google') {
      return res.status(401).json({
        success: false,
        message: 'Please sign in with Google'
      });
    }

    // Compare password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate token
    const token = generateToken(user._id);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: formatUserData(user),
        token
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
  }
};

// Google Sign In
exports.googleAuth = async (req, res) => {
  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({
        success: false,
        message: 'Google credential is required'
      });
    }

    // Verify the Google token
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();
    const { sub: googleId, email, name, picture } = payload;

    // console.log('Google payload:', { googleId, email, name, picture });

    // Check if user already exists (include profile image)
    let user = await User.findByEmailOrGoogleId(email, googleId).select('+profileImageBase64');

    if (user) {
      // Update existing user with Google info
      user.updateGoogleInfo(payload);
      await user.save();
      console.log('Updated existing user with Google info');
    } else {
      // Create new user with Google info
      user = new User({
        name: name,
        email: email,
        googleId: googleId,
        authProvider: 'google',
        picture: picture,
        googleProfileImage: picture,
        isActive: true,
        lastLogin: new Date()
      });
      await user.save();
      console.log('Created new Google user');
    }

    // Generate JWT token
    const token = generateToken(user._id);

    const userData = formatUserData(user);
    // console.log('Final user data being sent:', userData);

    res.status(200).json({
      success: true,
      message: 'Google authentication successful',
      data: {
        user: userData,
        token
      }
    });

  } catch (error) {
    console.error('Google auth error:', error);
    res.status(500).json({
      success: false,
      message: 'Google authentication failed'
    });
  }
};

// Get User Profile
exports.getProfile = async (req, res) => {
  try {
    // Include profile image in query
    const user = await User.findByIdWithProfileImage(req.user.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // console.log('Profile data for user:', user.profileImageInfo);

    res.status(200).json({
      success: true,
      message: 'Profile retrieved successfully',
      data: {
        user: formatUserData(user)
      }
    });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching profile'
    });
  }
};

// Upload Profile Image - DATABASE ONLY STORAGE
exports.uploadProfileImage = async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image file provided'
      });
    }

    console.log('Received file:', {
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      bufferLength: req.file.buffer.length
    });

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update user profile image using the model method
    user.updateProfileImageBase64(req.file.buffer, req.file.mimetype, req.file.size);
    
    await user.save();

    console.log('Profile image saved to database:', {
      type: user.profileImageType,
      size: user.profileImageSize,
      uploadDate: user.profileImageUploadDate
    });

    res.status(200).json({
      success: true,
      message: 'Profile image uploaded successfully',
      data: {
        imageUrl: user.displayImage, // This will be the base64 data URL
        imageInfo: user.profileImageInfo
      }
    });

  } catch (error) {
    console.error('Upload profile image error:', error);
    
    res.status(500).json({
      success: false,
      message: 'Server error while uploading profile image'
    });
  }
};

// Remove Profile Image
exports.removeProfileImage = async (req, res) => {
  try {
    const userId = req.user.userId;
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Remove profile image using model method
    user.removeProfileImage();
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Profile image removed successfully',
      data: {
        imageUrl: user.displayImage // Will show Google image or null
      }
    });

  } catch (error) {
    console.error('Remove profile image error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while removing profile image'
    });
  }
};

// Update User Profile
exports.updateProfile = async (req, res) => {
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

    const { name, phone, address } = req.body;
    const userId = req.user.userId;

    const user = await User.findByIdWithProfileImage(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update fields
    if (name) user.name = name;
    if (phone) user.phone = phone;
    if (address) user.address = { ...user.address, ...address };

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: formatUserData(user)
      }
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating profile'
    });
  }
};

// Delete Account
exports.deleteAccount = async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // Find the user first
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    // Import required models
    const Cart = require('../Models/cart.model');
    const Wishlist = require('../Models/wishlist.model');
    const Order = require('../Models/order.model');

    // Delete user's cart
    await Cart.deleteMany({ userId });

    // Delete user's wishlist
    await Wishlist.deleteMany({ userId });

    // Mark orders as deleted user instead of deleting them (for record keeping)
    await Order.updateMany(
      { userId }, 
      { 
        $set: { 
          userDeleted: true,
          deletedAt: new Date()
        } 
      }
    );

    // Delete the user account
    await User.findByIdAndDelete(userId);

    res.json({ 
      success: true, 
      message: 'Account deleted successfully' 
    });

  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error deleting account', 
      error: error.message 
    });
  }
};

// Export multer upload middleware for use in routes
exports.uploadMiddleware = upload.single('profileImage');