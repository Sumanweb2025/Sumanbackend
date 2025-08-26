const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  Product_id: {
    type: String,
    default: ''
  },
  Brand: {
    type: String,
    default: ''
  },
  Name: {
    type: String,
    default: ''
  },
  Gram: {
    type: String,
    default: ''
  },
  Category: {
    type: String,
    default: ''
  },
  'Sub-category': {
    type: String,
    default: ''
  },
  Price: {
    type: Number,
    default: 0,
    min: 0  // Ensure price is not negative
  },
  Ingredients: {
    type: String,
    default: ''
  },
  Description: {
    type: String,
    default: ''
  },
  Piece: {
    type: Number,
    default: 0,
    min: 0  // Ensure piece count is not negative
  },
  'Storage Condition': {
    type: String,
    default: ''
  },
  image: {
    type: String,
    default: ''
  },
  // Optional: Add rating if you want to include it later
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  }
}, {
  timestamps: true  // Optional: adds createdAt and updatedAt
});

module.exports = mongoose.model('Product', productSchema);