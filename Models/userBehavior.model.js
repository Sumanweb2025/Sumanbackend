const mongoose = require('mongoose');

// User Behavior Tracking Schema
const userBehaviorSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  sessionId: {
    type: String,
    required: true
  },
  // Product Interactions
  productViews: [{
    productId: {
      type: String, // Using product_id from your JSON data
      required: true
    },
    viewedAt: {
      type: Date,
      default: Date.now
    },
    viewDuration: {
      type: Number, // in seconds
      default: 0
    },
    source: {
      type: String,
      enum: ['search', 'category', 'recommendation', 'direct', 'wishlist', 'cart'],
      default: 'direct'
    }
  }],
  
  // Search Behavior
  searchQueries: [{
    query: String,
    searchedAt: {
      type: Date,
      default: Date.now
    },
    resultsCount: Number,
    clickedProducts: [String] // product_ids clicked from search
  }],
  
  // Cart Interactions
  cartActions: [{
    productId: String,
    action: {
      type: String,
      enum: ['add', 'remove', 'quantity_increase', 'quantity_decrease']
    },
    actionAt: {
      type: Date,
      default: Date.now
    },
    quantity: Number
  }],
  
  // Wishlist Interactions
  wishlistActions: [{
    productId: String,
    action: {
      type: String,
      enum: ['add', 'remove']
    },
    actionAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Purchase History
  purchases: [{
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order'
    },
    productId: String,
    quantity: Number,
    price: Number,
    purchasedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Category Preferences (derived from behavior)
  categoryPreferences: [{
    category: String,
    subCategory: String,
    interactionCount: {
      type: Number,
      default: 1
    },
    lastInteraction: {
      type: Date,
      default: Date.now
    },
    preferenceScore: {
      type: Number,
      default: 1
    }
  }],
  
  // Brand Preferences
  brandPreferences: [{
    brand: String,
    interactionCount: {
      type: Number,
      default: 1
    },
    lastInteraction: {
      type: Date,
      default: Date.now
    },
    preferenceScore: {
      type: Number,
      default: 1
    }
  }],
  
  // Price Range Preferences
  priceRangePreferences: {
    minPrice: {
      type: Number,
      default: 0
    },
    maxPrice: {
      type: Number,
      default: 1000
    },
    averageSpend: {
      type: Number,
      default: 0
    },
    totalSpent: {
      type: Number,
      default: 0
    }
  },
  
  // Device and Session Info
  deviceInfo: {
    userAgent: String,
    deviceType: {
      type: String,
      enum: ['mobile', 'tablet', 'desktop'],
      default: 'desktop'
    },
    screenResolution: String
  },
  
  // Recommendation Interactions
  recommendationInteractions: [{
    recommendationType: {
      type: String,
      enum: ['similar_products', 'frequently_bought', 'trending', 'personalized', 'category_based']
    },
    recommendedProductId: String,
    clicked: {
      type: Boolean,
      default: false
    },
    interactionAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true,
  // Expire sessions after 30 days of inactivity
  expireAfterSeconds: 30 * 24 * 60 * 60
});

// Indexes for better performance
userBehaviorSchema.index({ userId: 1, sessionId: 1 });
userBehaviorSchema.index({ 'productViews.productId': 1 });
userBehaviorSchema.index({ 'productViews.viewedAt': -1 });
userBehaviorSchema.index({ 'categoryPreferences.category': 1 });
userBehaviorSchema.index({ 'brandPreferences.brand': 1 });
userBehaviorSchema.index({ createdAt: -1 });

// Methods for updating behavior
userBehaviorSchema.methods.addProductView = function(productId, viewDuration = 0, source = 'direct') {
  this.productViews.push({
    productId,
    viewDuration,
    source,
    viewedAt: new Date()
  });
  
  // Keep only last 100 views to prevent document from growing too large
  if (this.productViews.length > 100) {
    this.productViews = this.productViews.slice(-100);
  }
};

userBehaviorSchema.methods.addCartAction = function(productId, action, quantity = 1) {
  this.cartActions.push({
    productId,
    action,
    quantity,
    actionAt: new Date()
  });
  
  // Keep only last 50 cart actions
  if (this.cartActions.length > 50) {
    this.cartActions = this.cartActions.slice(-50);
  }
};

userBehaviorSchema.methods.addWishlistAction = function(productId, action) {
  this.wishlistActions.push({
    productId,
    action,
    actionAt: new Date()
  });
  
  // Keep only last 50 wishlist actions
  if (this.wishlistActions.length > 50) {
    this.wishlistActions = this.wishlistActions.slice(-50);
  }
};

userBehaviorSchema.methods.updateCategoryPreference = function(category, subCategory = null) {
  const existingPref = this.categoryPreferences.find(pref => 
    pref.category === category && pref.subCategory === subCategory
  );
  
  if (existingPref) {
    existingPref.interactionCount += 1;
    existingPref.lastInteraction = new Date();
    existingPref.preferenceScore = Math.min(existingPref.preferenceScore + 0.1, 10);
  } else {
    this.categoryPreferences.push({
      category,
      subCategory,
      interactionCount: 1,
      lastInteraction: new Date(),
      preferenceScore: 1
    });
  }
  
  // Keep only top 20 category preferences
  this.categoryPreferences.sort((a, b) => b.preferenceScore - a.preferenceScore);
  if (this.categoryPreferences.length > 20) {
    this.categoryPreferences = this.categoryPreferences.slice(0, 20);
  }
};

userBehaviorSchema.methods.updateBrandPreference = function(brand) {
  const existingPref = this.brandPreferences.find(pref => pref.brand === brand);
  
  if (existingPref) {
    existingPref.interactionCount += 1;
    existingPref.lastInteraction = new Date();
    existingPref.preferenceScore = Math.min(existingPref.preferenceScore + 0.1, 10);
  } else {
    this.brandPreferences.push({
      brand,
      interactionCount: 1,
      lastInteraction: new Date(),
      preferenceScore: 1
    });
  }
  
  // Keep only top 15 brand preferences
  this.brandPreferences.sort((a, b) => b.preferenceScore - a.preferenceScore);
  if (this.brandPreferences.length > 15) {
    this.brandPreferences = this.brandPreferences.slice(0, 15);
  }
};

userBehaviorSchema.methods.updatePricePreference = function(price) {
  if (!price || price <= 0) return;
  
  const prefs = this.priceRangePreferences;
  
  // Update min/max if needed
  if (prefs.minPrice === 0 || price < prefs.minPrice) {
    prefs.minPrice = price;
  }
  if (price > prefs.maxPrice) {
    prefs.maxPrice = price;
  }
  
  // Update average spend (simple moving average)
  const currentAvg = prefs.averageSpend || 0;
  prefs.averageSpend = (currentAvg + price) / 2;
};

// Static methods for analytics
userBehaviorSchema.statics.getMostViewedProducts = function(limit = 10) {
  return this.aggregate([
    { $unwind: '$productViews' },
    { 
      $group: {
        _id: '$productViews.productId',
        viewCount: { $sum: 1 },
        lastViewed: { $max: '$productViews.viewedAt' }
      }
    },
    { $sort: { viewCount: -1 } },
    { $limit: limit }
  ]);
};

userBehaviorSchema.statics.getTrendingCategories = function(limit = 5) {
  return this.aggregate([
    { $unwind: '$categoryPreferences' },
    {
      $group: {
        _id: '$categoryPreferences.category',
        totalScore: { $sum: '$categoryPreferences.preferenceScore' },
        userCount: { $sum: 1 }
      }
    },
    { $sort: { totalScore: -1 } },
    { $limit: limit }
  ]);
};

module.exports = mongoose.model('UserBehavior', userBehaviorSchema);
