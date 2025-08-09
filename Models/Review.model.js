// models/Review.js
const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  product_id: {
    type: String,
    required: true,
    ref: 'Product'
  },
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User'
  },
  user_name: {
    type: String,
    required: true,
    trim: true
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  comment: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500
  }
}, {
  timestamps: true
});

// Index for efficient querying
reviewSchema.index({ product_id: 1, createdAt: -1 });
reviewSchema.index({ user_id: 1, product_id: 1 }, { unique: true }); // One review per user per product

module.exports = mongoose.models.Review || mongoose.model('Review', reviewSchema);