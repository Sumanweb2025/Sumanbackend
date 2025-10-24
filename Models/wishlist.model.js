const mongoose = require('mongoose');

const wishlistSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false, // Changed: Allow null for guests
    sparse: true
  },
  sessionId: {
    type: String, // For guest users
    sparse: true,
    index: true
  },
  isGuest: {
    type: Boolean,
    default: false
  },
  products: [{
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],
  expiresAt: {
    type: Date,
    default: () => new Date(+new Date() + 7 * 24 * 60 * 60 * 1000) // 7 days expiry
  }
}, {
  timestamps: true
});

// Compound indexes
// Sparse unique indexes to prevent duplicate key errors
wishlistSchema.index({ userId: 1 }, { unique: true, sparse: true });
wishlistSchema.index({ sessionId: 1 }, { unique: true, sparse: true });

// Additional indexes for performance
wishlistSchema.index({ 'products.productId': 1 });
wishlistSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
wishlistSchema.index({ isGuest: 1, expiresAt: 1 });

module.exports = mongoose.model('Wishlist', wishlistSchema);