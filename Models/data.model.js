const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({

  product_id: {
    type: String,
    required: true,
    unique: true, // prevent duplicates
    trim: true
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
  sub_category: {
    type: String,
    trim: true
  },
  price: {
    type: Number,
    required: false,
    min: 0
  },
  piece: {
    type: Number,
    default: 1
  },

  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5

  },
  description: {
    type: String,
    trim: true
  },
  ingredients: {
    type: String,
    trim: true
  },
  storage_condition: {
    type: String,
    trim: true
  },
  image: {
    type: [String], // Array of strings
    default: [],
    validate: {
      validator: function(images) {
        return images.length <= 5; // Max 5 images per product
      },
      message: 'Maximum 5 images allowed per product'
    }
  },
  gram: {
    type: String,
    trim: true
  }
}, {
  timestamps: true // auto adds createdAt & updatedAt

});

module.exports = mongoose.model('Product', productSchema);