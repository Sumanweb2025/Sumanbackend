const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null // null for non-users, ObjectId for registered users
  },
  name: {
    type: String,
    trim: true,
    default: null // Optional for non-users
  },
  phone: {
    type: String,
    trim: true,
    default: null // Optional field
  },
  subscriptionType: {
    type: String,
    enum: ['newsletter', 'promotional', 'updates', 'all'],
    default: 'newsletter'
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'unsubscribed'],
    default: 'active'
  },
  source: {
    type: String,
    enum: ['website', 'mobile_app', 'social_media', 'referral', 'other'],
    default: 'website'
  },
  userType: {
    type: String,
    enum: ['registered', 'guest'],
    required: true
  },
  preferences: {
    emailNotifications: {
      type: Boolean,
      default: true
    },
    smsNotifications: {
      type: Boolean,
      default: false
    },
    promotionalEmails: {
      type: Boolean,
      default: true
    },
    weeklyDigest: {
      type: Boolean,
      default: false
    }
  },
  tags: [{
    type: String,
    trim: true
  }],
  subscribedAt: {
    type: Date,
    default: Date.now
  },
  unsubscribedAt: {
    type: Date,
    default: null
  },
  lastEmailSent: {
    type: Date,
    default: null
  },
  emailsSentCount: {
    type: Number,
    default: 0
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  verificationToken: {
    type: String,
    default: null
  },
  verificationTokenExpires: {
    type: Date,
    default: null
  },
  unsubscribeToken: {
    type: String,
    default: null
  },
  ipAddress: {
    type: String,
    default: null
  },
  userAgent: {
    type: String,
    default: null
  },
  location: {
    country: String,
    city: String,
    region: String
  },
  notes: {
    type: String,
    default: null
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better performance
subscriptionSchema.index({ email: 1 });
subscriptionSchema.index({ userId: 1 });
subscriptionSchema.index({ status: 1 });
subscriptionSchema.index({ userType: 1 });
subscriptionSchema.index({ subscribedAt: -1 });
subscriptionSchema.index({ email: 1, status: 1 });

// Compound index to ensure unique email per subscription type
subscriptionSchema.index({ 
  email: 1, 
  subscriptionType: 1 
}, { 
  unique: true,
  partialFilterExpression: { status: { $ne: 'unsubscribed' } }
});

// Virtual to check if subscription is active
subscriptionSchema.virtual('isActive').get(function() {
  return this.status === 'active';
});

// Virtual to get subscription duration
subscriptionSchema.virtual('subscriptionDuration').get(function() {
  if (this.unsubscribedAt) {
    return this.unsubscribedAt - this.subscribedAt;
  }
  return Date.now() - this.subscribedAt;
});

// Pre-save middleware
subscriptionSchema.pre('save', async function(next) {
  if (this.isNew) {
    // Generate verification token for new subscriptions
    if (!this.verificationToken) {
      this.verificationToken = require('crypto').randomBytes(32).toString('hex');
      this.verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    }
    
    // Generate unsubscribe token
    if (!this.unsubscribeToken) {
      this.unsubscribeToken = require('crypto').randomBytes(32).toString('hex');
    }
    
    // Set user type based on userId
    if (this.userId) {
      this.userType = 'registered';
    } else {
      this.userType = 'guest';
    }
  }
  
  next();
});

// Static methods
subscriptionSchema.statics.findActiveSubscriptions = function() {
  return this.find({ status: 'active' });
};

subscriptionSchema.statics.findByEmail = function(email) {
  return this.findOne({ 
    email: email.toLowerCase(),
    status: { $ne: 'unsubscribed' }
  });
};

subscriptionSchema.statics.findRegisteredUserSubscriptions = function() {
  return this.find({ 
    userType: 'registered',
    status: 'active'
  }).populate('userId', 'name email');
};

subscriptionSchema.statics.findGuestSubscriptions = function() {
  return this.find({ 
    userType: 'guest',
    status: 'active'
  });
};

subscriptionSchema.statics.getSubscriptionStats = async function() {
  const stats = await this.aggregate([
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        active: { 
          $sum: { 
            $cond: [{ $eq: ['$status', 'active'] }, 1, 0] 
          } 
        },
        registered: { 
          $sum: { 
            $cond: [{ $eq: ['$userType', 'registered'] }, 1, 0] 
          } 
        },
        guests: { 
          $sum: { 
            $cond: [{ $eq: ['$userType', 'guest'] }, 1, 0] 
          } 
        },
        verified: { 
          $sum: { 
            $cond: ['$isVerified', 1, 0] 
          } 
        }
      }
    }
  ]);
  
  return stats[0] || {
    total: 0,
    active: 0,
    registered: 0,
    guests: 0,
    verified: 0
  };
};

// Instance methods
subscriptionSchema.methods.unsubscribe = function() {
  this.status = 'unsubscribed';
  this.unsubscribedAt = new Date();
  return this.save();
};

subscriptionSchema.methods.resubscribe = function() {
  this.status = 'active';
  this.unsubscribedAt = null;
  return this.save();
};

subscriptionSchema.methods.verify = function() {
  this.isVerified = true;
  this.verificationToken = null;
  this.verificationTokenExpires = null;
  return this.save();
};

subscriptionSchema.methods.updatePreferences = function(preferences) {
  this.preferences = { ...this.preferences, ...preferences };
  return this.save();
};

subscriptionSchema.methods.incrementEmailCount = function() {
  this.emailsSentCount += 1;
  this.lastEmailSent = new Date();
  return this.save();
};

// Export the model
module.exports = mongoose.model('Subscription', subscriptionSchema);