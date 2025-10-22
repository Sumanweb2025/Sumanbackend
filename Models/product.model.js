
const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  product_id: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  brand: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    required: true,
    trim: true
  },
  sub_category: { type: String },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  piece: {
    type: Number,
    required: true,
    min: 0
  },
  rating: {
    type: Number,
    min: 0,
    max: 5,
    default: 0
  },
  review_count: {
    type: Number,
    default: 0,
    min: 0
  },
  description: {
    type: String,
    required: true
  },
  ingredients: { type: String },
  storage_condition: { type: String },
  image: [{
    type: String,
    required: true
  }],
  gram: {
    type: Number,
    required: true,
    min: 0
  }
}, {
  timestamps: true
});

// Add indexes for better query performance
productSchema.index({ product_id: 1 });
productSchema.index({ category: 1 });
productSchema.index({ brand: 1 });
productSchema.index({ price: 1 });
productSchema.index({ rating: -1 });
productSchema.index({ category: 1, brand: 1 });
productSchema.index({ name: 'text', description: 'text' });

// Check if model already exists before creating
module.exports = mongoose.models.Product || mongoose.model('Product', productSchema);