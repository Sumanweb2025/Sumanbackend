const User = require('../Models/user.model');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const { OAuth2Client } = require('google-auth-library');
const multer = require('multer');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const { migrateGuestDataToUser } = require('../Utils/guestMigration');

// Initialize Google OAuth client
const googleClient = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET
);

// Enhanced OTP storage with Redis-like structure (use Redis in production)
class SecureOTPStorage {
  constructor() {
    this.storage = new Map();
    this.ipAttempts = new Map();
    this.phoneAttempts = new Map();
  }

  set(key, data) {
    this.storage.set(key, {
      ...data,
      createdAt: new Date()
    });
  }

  get(key) {
    return this.storage.get(key);
  }

  delete(key) {
    return this.storage.delete(key);
  }

  // Track IP-based attempts
  trackIPAttempt(ip) {
    const current = this.ipAttempts.get(ip) || { count: 0, lastAttempt: new Date() };
    current.count += 1;
    current.lastAttempt = new Date();
    this.ipAttempts.set(ip, current);
    return current.count;
  }

  // Track phone-based attempts
  trackPhoneAttempt(phone) {
    const current = this.phoneAttempts.get(phone) || { count: 0, lastAttempt: new Date() };
    current.count += 1;
    current.lastAttempt = new Date();
    this.phoneAttempts.set(phone, current);
    return current.count;
  }

  // Check if IP is blocked
  isIPBlocked(ip) {
    const attempts = this.ipAttempts.get(ip);
    if (!attempts) return false;
    
    const timeDiff = new Date() - attempts.lastAttempt;
    const cooldownPeriod = 15 * 60 * 1000; // 15 minutes
    
    if (timeDiff > cooldownPeriod) {
      this.ipAttempts.delete(ip);
      return false;
    }
    
    return attempts.count >= 10; // Max 10 attempts per IP per 15 minutes
  }

  // Check if phone is blocked
  isPhoneBlocked(phone) {
    const attempts = this.phoneAttempts.get(phone);
    if (!attempts) return false;
    
    const timeDiff = new Date() - attempts.lastAttempt;
    const cooldownPeriod = 30 * 60 * 1000; // 30 minutes
    
    if (timeDiff > cooldownPeriod) {
      this.phoneAttempts.delete(phone);
      return false;
    }
    
    return attempts.count >= 5; // Max 5 attempts per phone per 30 minutes
  }

  // Clean up expired data
  cleanup() {
    const now = new Date();
    
    // Clean OTP storage
    for (const [key, data] of this.storage.entries()) {
      if (now > data.expiresAt) {
        this.storage.delete(key);
      }
    }
    
    // Clean IP attempts
    for (const [ip, data] of this.ipAttempts.entries()) {
      if (now - data.lastAttempt > 15 * 60 * 1000) {
        this.ipAttempts.delete(ip);
      }
    }
    
    // Clean phone attempts
    for (const [phone, data] of this.phoneAttempts.entries()) {
      if (now - data.lastAttempt > 30 * 60 * 1000) {
        this.phoneAttempts.delete(phone);
      }
    }
  }
}

const otpStorage = new SecureOTPStorage();

// Rate limiters
const signupRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 signups per IP per 15 minutes
  message: { success: false, message: 'Too many signup attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const otpRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 3, // 3 OTP requests per IP per 5 minutes
  message: { success: false, message: 'Too many OTP requests. Please wait before trying again.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Configure multer for memory storage
const storage = multer.memoryStorage();
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, GIF and WebP images are allowed.'), false);
  }
};

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: fileFilter
});

// Generate secure OTP
const generateSecureOTP = () => {
  // Use crypto for better randomness
  const randomBytes = crypto.randomBytes(3);
  const otp = (parseInt(randomBytes.toString('hex'), 16) % 900000 + 100000).toString();
  return otp;
};

// Generate JWT Token
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET || 'your_jwt_secret', {
    expiresIn: '7d'
  });
};

// Enhanced SMS sending with retry logic
const sendSMSOTP = async (fullPhoneNumber, otp, retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      console.log(`[SMS] Attempt ${i + 1}: Sending OTP ${otp} to ${fullPhoneNumber}`);
      
      // Implement your SMS provider here
      // Example with different providers:
      
      // For MSG91:
      // const response = await axios.post('https://api.msg91.com/api/v5/otp', {
      //   template_id: process.env.MSG91_TEMPLATE_ID,
      //   mobile: `91${phone}`,
      //   authkey: process.env.MSG91_AUTHKEY,
      //   otp: otp
      // });
      
      // For Fast2SMS:
      // const response = await axios.get(`https://www.fast2sms.com/dev/bulkV2`, {
      //   params: {
      //     authorization: process.env.FAST2SMS_API_KEY,
      //     variables_values: otp,
      //     route: 'otp',
      //     numbers: phone
      //   }
      // });
      
      // For now, simulate success (remove this in production)
      await new Promise(resolve => setTimeout(resolve, 100));
      
      return { success: true };
    } catch (error) {
      console.error(`SMS sending attempt ${i + 1} failed:`, error.message);
      if (i === retries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1))); // Exponential backoff
    }
  }
};

// Helper function to format user data
const formatUserData = (user) => {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    countryCode: user.countryCode,
    fullPhoneNumber: user.fullPhoneNumber,
    address: user.address,
    role: user.role,
    lastLogin: user.lastLogin,
    authProvider: user.authProvider,
    profileImage: user.displayImage,
    picture: user.picture,
    googleProfileImage: user.googleProfileImage,
    profileImageInfo: user.profileImageInfo,
    emailVerified: user.emailVerified,
    phoneVerified: user.phoneVerified,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    wishlist: user.wishlist,
    cart: user.cart
  };
};

// Enhanced User Signup with Security
exports.signup = [signupRateLimit, async (req, res) => {
  try {
    const clientIP = req.ip || req.connection.remoteAddress;
    
    if (otpStorage.isIPBlocked(clientIP)) {
      return res.status(429).json({
        success: false,
        message: 'Too many requests from this IP. Please try again later.'
      });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { name, email, password, phone, countryCode } = req.body;

    // Validate phone and countryCode
    if (!phone || !countryCode) {
      return res.status(400).json({
        success: false,
        message: 'Phone number and country code are required'
      });
    }

    // Check if user already exists with this phone number
    const existingUser = await User.findOne({ 
      $or: [
        { email }, 
        { phone: phone, countryCode: countryCode }
      ] 
    });
    
    if (existingUser) {
      let field = 'email';
      if (existingUser.phone === phone && existingUser.countryCode === countryCode) {
        field = 'phone number';
      }
      return res.status(409).json({
        success: false,
        message: `User already exists with this ${field}`
      });
    }

    // Check phone-based blocking using full number
    const fullPhoneNumber = `${countryCode}${phone}`;
    if (otpStorage.isPhoneBlocked(fullPhoneNumber)) {
      return res.status(429).json({
        success: false,
        message: 'Too many OTP requests for this phone number. Please try again later.'
      });
    }

    // Generate secure OTP and session
    const otp = generateSecureOTP();
    const tempUserId = crypto.randomUUID();
    const sessionToken = crypto.randomBytes(32).toString('hex');
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

    // Store OTP data with phone and countryCode
    otpStorage.set(tempUserId, {
      otp,
      phone,
      countryCode,
      fullPhoneNumber,
      sessionToken,
      userData: { name, email, password, phone, countryCode },
      expiresAt: otpExpiry,
      attempts: 0,
      maxAttempts: 3,
      clientIP,
      createdAt: new Date()
    });

    otpStorage.trackIPAttempt(clientIP);

    try {
      // Send OTP via SMS with full number
      await sendSMSOTP(fullPhoneNumber, otp);
      
      res.status(200).json({
        success: true,
        message: 'OTP sent successfully',
        data: {
          tempUserId,
          sessionToken,
          expiresIn: 600,
          phoneDisplay: fullPhoneNumber // Send back for display
        }
      });
    } catch (smsError) {
      console.error('SMS sending failed:', smsError);
      otpStorage.delete(tempUserId);
      
      res.status(500).json({
        success: false,
        message: 'Failed to send OTP. Please try again.'
      });
    }

  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during registration'
    });
  }
}];

// Enhanced OTP Verification
exports.verifyOtp = [otpRateLimit, async (req, res) => {
  try {
    const clientIP = req.ip || req.connection.remoteAddress;
    const { tempUserId, otp, phone, countryCode, sessionId } = req.body;

    if (!tempUserId || !otp || !phone || !countryCode) {
      return res.status(400).json({
        success: false,
        message: 'Temp user ID, OTP, phone number, and country code are required'
      });
    }

    if (otpStorage.isIPBlocked(clientIP)) {
      return res.status(429).json({
        success: false,
        message: 'Too many requests from this IP. Please try again later.'
      });
    }

    const otpData = otpStorage.get(tempUserId);
    
    if (!otpData) {
      return res.status(404).json({
        success: false,
        message: 'Invalid or expired OTP session'
      });
    }

    if (otpData.clientIP !== clientIP) {
      otpStorage.delete(tempUserId);
      return res.status(401).json({
        success: false,
        message: 'Session security violation detected'
      });
    }

    if (new Date() > otpData.expiresAt) {
      otpStorage.delete(tempUserId);
      return res.status(400).json({
        success: false,
        message: 'OTP has expired. Please request a new one.'
      });
    }

    if (otpData.attempts >= otpData.maxAttempts) {
      otpStorage.delete(tempUserId);
      otpStorage.trackPhoneAttempt(otpData.fullPhoneNumber);
      return res.status(400).json({
        success: false,
        message: 'Maximum verification attempts exceeded. Please request a new OTP.'
      });
    }

    const isValidOTP = crypto.timingSafeEqual(
      Buffer.from(otpData.otp),
      Buffer.from(otp)
    );
    
    const isValidPhone = otpData.phone === phone && otpData.countryCode === countryCode;

    if (!isValidOTP || !isValidPhone) {
      otpData.attempts += 1;
      otpStorage.set(tempUserId, otpData);
      otpStorage.trackIPAttempt(clientIP);
      
      const remainingAttempts = otpData.maxAttempts - otpData.attempts;
      
      return res.status(400).json({
        success: false,
        message: 'Invalid OTP. Please try again.',
        attemptsLeft: remainingAttempts
      });
    }

    const { userData } = otpData;
    
    const existingUser = await User.findOne({ 
      $or: [
        { email: userData.email }, 
        { phone: userData.phone, countryCode: userData.countryCode }
      ] 
    });
    
    if (existingUser) {
      otpStorage.delete(tempUserId);
      return res.status(409).json({
        success: false,
        message: 'User already exists'
      });
    }

    const user = new User({
      name: userData.name,
      email: userData.email,
      password: userData.password,
      phone: userData.phone,
      countryCode: userData.countryCode,
      authProvider: 'local',
      phoneVerified: true,
      emailVerified: false,
      isActive: true,
      lastLogin: new Date()
    });

    await user.save();

    const token = generateToken(user._id);

    // Migrate guest data if sessionId provided
    if (sessionId) {
      try {
        const migrationResult = await migrateGuestDataToUser(user._id, sessionId);
        console.log('Guest data migration result:', migrationResult);
      } catch (migrationError) {
        console.error('Migration error (non-fatal):', migrationError);
      }
    }

    otpStorage.delete(tempUserId);

    res.status(201).json({
      success: true,
      message: 'Account created and verified successfully',
      data: {
        user: formatUserData(user),
        token
      }
    });

  } catch (error) {
    console.error('OTP verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during verification'
    });
  }
}];

// Enhanced Resend OTP
exports.resendOtp = [otpRateLimit, async (req, res) => {
  try {
    const clientIP = req.ip || req.connection.remoteAddress;
    const { tempUserId, phone, countryCode } = req.body;

    if (!tempUserId || !phone || !countryCode) {
      return res.status(400).json({
        success: false,
        message: 'Temp user ID, phone number, and country code are required'
      });
    }

    const fullPhoneNumber = `${countryCode}${phone}`;

    if (otpStorage.isIPBlocked(clientIP) || otpStorage.isPhoneBlocked(fullPhoneNumber)) {
      return res.status(429).json({
        success: false,
        message: 'Too many requests. Please wait before trying again.'
      });
    }

    const otpData = otpStorage.get(tempUserId);
    
    if (!otpData) {
      return res.status(404).json({
        success: false,
        message: 'Invalid session. Please start signup again.'
      });
    }

    if (otpData.clientIP !== clientIP || otpData.phone !== phone || otpData.countryCode !== countryCode) {
      otpStorage.delete(tempUserId);
      return res.status(401).json({
        success: false,
        message: 'Session security violation'
      });
    }

    const newOtp = generateSecureOTP();
    const newExpiry = new Date(Date.now() + 10 * 60 * 1000);

    otpData.otp = newOtp;
    otpData.expiresAt = newExpiry;
    otpData.attempts = 0;
    otpStorage.set(tempUserId, otpData);

    otpStorage.trackIPAttempt(clientIP);
    otpStorage.trackPhoneAttempt(fullPhoneNumber);

    try {
      await sendSMSOTP(fullPhoneNumber, newOtp);
      
      res.status(200).json({
        success: true,
        message: 'New OTP sent successfully',
        data: { expiresIn: 600 }
      });
    } catch (smsError) {
      console.error('SMS resend failed:', smsError);
      res.status(500).json({
        success: false,
        message: 'Failed to send OTP. Please try again.'
      });
    }

  } catch (error) {
    console.error('Resend OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during OTP resend'
    });
  }
}];


// Existing methods (login, getProfile, etc.) - keep as they were
exports.login = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { email, password, sessionId } = req.body; // sessionId add பண்ணுங்க

    const user = await User.findOne({ email }).select('+password +profileImageBase64');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account has been deactivated'
      });
    }

    if (user.authProvider === 'google') {
      return res.status(401).json({
        success: false,
        message: 'Please sign in with Google'
      });
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    user.lastLogin = new Date();
    await user.save();

    const token = generateToken(user._id);

    // ⭐ IMPORTANT: Migrate guest data if sessionId provided
    if (sessionId) {
      try {
        const migrationResult = await migrateGuestDataToUser(user._id, sessionId);
        console.log('Guest data migration result:', migrationResult);
      } catch (migrationError) {
        console.error('Migration error (non-fatal):', migrationError);
      }
    }

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

// Google Auth
exports.googleAuth = async (req, res) => {
  try {
    const { credential, sessionId } = req.body; // sessionId add பண்ணுங்க

    if (!credential) {
      return res.status(400).json({
        success: false,
        message: 'Google credential is required'
      });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();
    const { sub: googleId, email, name, picture } = payload;

    let user = await User.findByEmailOrGoogleId(email, googleId).select('+profileImageBase64');
    let isNewUser = false;

    if (user) {
      user.updateGoogleInfo(payload);
      await user.save();
    } else {
      user = new User({
        name: name,
        email: email,
        googleId: googleId,
        authProvider: 'google',
        picture: picture,
        googleProfileImage: picture,
        isActive: true,
        emailVerified: true,
        phoneVerified: false,
        lastLogin: new Date()
      });
      await user.save();
      isNewUser = true;
    }

    const token = generateToken(user._id);

    // ⭐ IMPORTANT: Migrate guest data if sessionId provided
    if (sessionId) {
      try {
        const migrationResult = await migrateGuestDataToUser(user._id, sessionId);
        console.log('Guest data migration result:', migrationResult);
      } catch (migrationError) {
        console.error('Migration error (non-fatal):', migrationError);
      }
    }

    const userData = formatUserData(user);

    res.status(200).json({
      success: true,
      message: 'Google authentication successful',
      data: {
        user: userData,
        token,
        isNewUser
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
    const user = await User.findByIdWithProfileImage(req.user.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

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

// Upload Profile Image
exports.uploadProfileImage = async (req, res) => {
  try {
    const userId = req.user.userId;
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image file provided'
      });
    }

    // console.log('Uploading profile image for user:', userId);
    // console.log('File details:', {
    //   mimetype: req.file.mimetype,
    //   size: req.file.size,
    //   originalname: req.file.originalname
    // });

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update profile image in database using base64
    user.updateProfileImageBase64(req.file.buffer, req.file.mimetype, req.file.size);
    
    // CRITICAL FIX: Also update the profileImage field
    const base64String = req.file.buffer.toString('base64');
    const dataURL = `data:${req.file.mimetype};base64,${base64String}`;
    user.profileImage = dataURL;  
    
    await user.save();

    //console.log('Profile image saved successfully');
    // console.log('Image URL:', user.displayImage);

    res.status(200).json({
      success: true,
      message: 'Profile image uploaded successfully',
      data: {
        imageUrl: user.displayImage,
        imageInfo: user.profileImageInfo
      }
    });

  } catch (error) {
    console.error('Upload profile image error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while uploading profile image',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
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

    // Remove profile image from database
    user.removeProfileImage();
    user.profileImage = null; // Also clear profileImage field
    
    await user.save();

    //console.log('Profile image removed successfully for user:', userId);

    res.status(200).json({
      success: true,
      message: 'Profile image removed successfully',
      data: {
        imageUrl: user.displayImage // Will fallback to Google image if available
      }
    });

  } catch (error) {
    console.error('Remove profile image error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while removing profile image',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Update User Profile
exports.updateProfile = async (req, res) => {
  try {
    // Remove strict validation - make all fields optional
    const { name, phone, address } = req.body;
    const userId = req.user.userId;

    const user = await User.findByIdWithProfileImage(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update fields only if provided
    if (name) user.name = name;
    
    if (phone !== undefined) {
      if (phone && phone !== user.phone) {
        user.phone = phone;
        user.phoneVerified = false;
      } else if (phone === '') {
        user.phone = undefined;
      }
    }
    
    if (address) {
      user.address = { ...user.address, ...address };
    }

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
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    const Cart = require('../Models/cart.model');
    const Wishlist = require('../Models/wishlist.model');
    const Order = require('../Models/order.model');

    await Cart.deleteMany({ userId });
    await Wishlist.deleteMany({ userId });
    await Order.updateMany(
      { userId }, 
      { 
        $set: { 
          userDeleted: true,
          deletedAt: new Date()
        } 
      }
    );

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

// Export multer upload middleware
exports.uploadMiddleware = upload.single('profileImage');

// Cleanup function - run this periodically (e.g., via cron job)
exports.cleanupExpiredData = () => {
  otpStorage.cleanup();
};

// Run cleanup every 5 minutes
setInterval(exports.cleanupExpiredData, 5 * 60 * 1000);