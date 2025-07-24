const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema({
  product_id: {
    type: String,
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  price: {
    type: Number,
    required: true
  },
  name: {
    type: String,
    required: false
  },
  image: {
    type: String,
    required: false
  }
});

const cartSchema = new mongoose.Schema({
  items: [cartItemSchema],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt field before saving
cartSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Virtual for cart total
cartSchema.virtual('total').get(function() {
  return this.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
});

// Virtual for total items count
cartSchema.virtual('itemCount').get(function() {
  return this.items.reduce((sum, item) => sum + item.quantity, 0);
});

// Ensure virtual fields are serialized
cartSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Cart', cartSchema);