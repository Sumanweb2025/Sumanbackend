const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  productId: {
    type: String,
    required: true
  },
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  userEmail: {  // Changed from userId
    type: String,
    required: true
  },
  userName: {
    type: String,
    required: true
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  reviewText: {
    type: String,
    maxlength: 500
  },
  images: [String]
}, { timestamps: true });

module.exports = mongoose.model('Review', reviewSchema);