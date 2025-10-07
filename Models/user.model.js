const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [50, 'Name cannot exceed 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    match: [
      /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
      'Please enter a valid email'
    ]
  },
  password: {
    type: String,
    minlength: [6, 'Password must be at least 6 characters'],
    select: false,
    required: function () {
      return this.authProvider === 'local';
    }
  },
  phone: {
    type: String,
    trim: true,
    match: [/^\d{10,15}$/, 'Please enter a valid phone number']
  },
  countryCode: {
    type: String,
    trim: true,
    default: '+1' // Default country code
  },
  fullPhoneNumber: {
    type: String,
    trim: true,
    // This will store the complete number with country code for display
  },
  phoneVerified: {
    type: Boolean,
    default: false
  },
  address: {
    street: { type: String, trim: true },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    pincode: { type: String, trim: true },
    country: { type: String, default: 'India' }
  },
  role: {
    type: String,
    enum: ['customer', 'admin'],
    default: 'customer'
  },
  wishlist: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
  }],
  cart: [{
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product'
    },
    quantity: {
      type: Number,
      default: 1
    }
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date
  },
  // Google Authentication fields
  googleId: {
    type: String,
    unique: true,
    sparse: true // Allows multiple null values
  },
  authProvider: {
    type: String,
    enum: ['local', 'google'],
    default: 'local'
  },
  profileImageBase64: {
    type: String, // Store base64 encoded image data
    maxlength: 16 * 1024 * 1024, // ~16MB limit for base64 string
    select: false // Don't include by default (large field)
  },
  profileImageType: {
    type: String, 
    enum: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
  },
  profileImageSize: {
    type: Number, 
    max: [5 * 1024 * 1024, 'Image size cannot exceed 5MB']
  },
  profileImageUploadDate: {
    type: Date, 
    default: Date.now
  },
  profileImage: {
    type: String, 
    trim: true
  },
  picture: {
    type: String, 
    trim: true
  },
  googleProfileImage: {
    type: String, 
    trim: true
  },
  emailVerified: {
    type: Boolean,
    default: function () {
      return this.authProvider === 'google'; 
    }
  },
  emailVerificationToken: {
    type: String,
    select: false
  },
  emailVerificationExpires: {
    type: Date,
    select: false
  },
  passwordResetToken: {
    type: String,
    select: false
  },
  passwordResetExpires: {
    type: Date,
    select: false
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual field for getting the best available profile image
userSchema.virtual('displayImage').get(function () {
  // Priority: Database stored image > Google current picture > Google backup image > Legacy profileImage
  if (this.profileImageBase64) {
    return this.profileImageBase64; 
  }
  return this.picture || this.googleProfileImage || this.profileImage || null;
});

// Virtual field for full profile image URL (if using relative paths)
userSchema.virtual('fullProfileImageUrl').get(function () {
  if (this.profileImage && !this.profileImage.startsWith('http') && !this.profileImage.startsWith('data:')) {
    return `${process.env.BASE_URL || 'http://localhost:8000'}${this.profileImage}`;
  }
  return this.displayImage;
});

// Virtual field for profile image info (useful for debugging)
userSchema.virtual('profileImageInfo').get(function () {
  return {
    hasBase64Image: !!this.profileImageBase64,
    hasGoogleImage: !!(this.picture || this.googleProfileImage),
    hasLegacyImage: !!this.profileImage,
    imageType: this.profileImageType,
    imageSize: this.profileImageSize,
    uploadDate: this.profileImageUploadDate
  };
});

// Indexes for better query performance
userSchema.index({ email: 1 });
userSchema.index({ googleId: 1 });
userSchema.index({ authProvider: 1 });
userSchema.index({ isActive: 1 });
userSchema.index({ profileImageUploadDate: -1 }); 

// Hash password before saving (only for local auth)
userSchema.pre('save', async function (next) {
  if (!this.isModified('password') || this.authProvider !== 'local') return next();

  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Add a pre-save hook to construct fullPhoneNumber
userSchema.pre('save', function(next) {
  if (this.isModified('phone') || this.isModified('countryCode')) {
    if (this.phone && this.countryCode) {
      this.fullPhoneNumber = `${this.countryCode}${this.phone}`;
    }
  }
  next();
});

// Compare password method (only for local auth)
userSchema.methods.comparePassword = async function (candidatePassword) {
  if (this.authProvider !== 'local') {
    return false;
  }
  return await bcrypt.compare(candidatePassword, this.password);
};

// Method to get safe user data for API responses
userSchema.methods.getSafeUserData = function () {
  return {
    id: this._id,
    name: this.name,
    email: this.email,
    phone: this.phone,
    address: this.address,
    role: this.role,
    isActive: this.isActive,
    lastLogin: this.lastLogin,
    authProvider: this.authProvider,
    profileImage: this.displayImage, 
    picture: this.picture,
    googleProfileImage: this.googleProfileImage,
    displayImage: this.displayImage,
    fullProfileImageUrl: this.fullProfileImageUrl,
    profileImageInfo: this.profileImageInfo, 
    emailVerified: this.emailVerified,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
    wishlist: this.wishlist,
    cart: this.cart
  };
};

// Method to update Google profile information
userSchema.methods.updateGoogleInfo = function (googleData) {
  const { sub: googleId, name, email, picture } = googleData;

  if (googleId) this.googleId = googleId;
  if (name && !this.name) this.name = name; 
  if (email && !this.email) this.email = email; 
  if (picture) {
    this.picture = picture;
    this.googleProfileImage = picture; 
  }

  this.lastLogin = new Date();
  this.emailVerified = true; 
};

// Method to update profile image in database
userSchema.methods.updateProfileImageBase64 = function (imageBuffer, mimeType, originalSize) {
  // Convert buffer to base64 data URL
  const base64String = imageBuffer.toString('base64');
  const dataURL = `data:${mimeType};base64,${base64String}`;

  this.profileImageBase64 = dataURL;
  this.profileImageType = mimeType;
  this.profileImageSize = originalSize;
  this.profileImageUploadDate = new Date();

  // Clear legacy fields when new image is uploaded
  this.profileImage = null;

  console.log(`Profile image updated - Type: ${mimeType}, Size: ${originalSize} bytes`);
};

// Method to remove profile image from database
userSchema.methods.removeProfileImage = function () {
  this.profileImageBase64 = undefined;
  this.profileImageType = undefined;
  this.profileImageSize = undefined;
  this.profileImageUploadDate = undefined;

  console.log('Profile image removed from database');
};

// Static method to find user by email or Google ID
userSchema.statics.findByEmailOrGoogleId = function (email, googleId) {
  const query = {};
  if (email && googleId) {
    query.$or = [{ email: email }, { googleId: googleId }];
  } else if (email) {
    query.email = email;
  } else if (googleId) {
    query.googleId = googleId;
  }

  return this.findOne(query);
};

// Static method to get active users only
userSchema.statics.findActive = function (conditions = {}) {
  return this.find({ ...conditions, isActive: true });
};

// Static method to find user with profile image included
userSchema.statics.findByIdWithProfileImage = function (userId) {
  return this.findById(userId).select('+profileImageBase64');
};

// Remove sensitive data from JSON output
userSchema.methods.toJSON = function () {
  const user = this.toObject({ virtuals: true });

  // Remove sensitive fields
  delete user.password;
  delete user.googleId; // Don't expose googleId in API responses
  delete user.emailVerificationToken;
  delete user.emailVerificationExpires;
  delete user.passwordResetToken;
  delete user.passwordResetExpires;
  // Note: profileImageBase64 is already excluded by select: false

  return user;
};

// Pre-remove middleware to clean up related data
userSchema.pre('remove', async function (next) {
  try {
    // Here you can add cleanup logic for related data
    // For example, remove user's orders, reviews, etc.
    console.log(`Cleaning up data for user: ${this.email}`);
    next();
  } catch (error) {
    next(error);
  }
});

module.exports = mongoose.model('User', userSchema);