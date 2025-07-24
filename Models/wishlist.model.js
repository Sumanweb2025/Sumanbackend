const mongoose = require('mongoose');

const wishlistItemSchema = new mongoose.Schema({
  product_id: {
    type: String,
    required: true
  },
  added_date: {
    type: Date,
    default: Date.now
  }
});

const wishlistSchema = new mongoose.Schema({
  items: [wishlistItemSchema]
}, {
  timestamps: true
});

// Index for faster queries
wishlistSchema.index({ 'items.product_id': 1 });

const Wishlist = mongoose.model('Wishlist', wishlistSchema);

module.exports = Wishlist;