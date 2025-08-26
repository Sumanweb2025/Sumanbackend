const mongoose = require('mongoose');

const cartSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  items: [{
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
      default: 1
    },
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],
  totalAmount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Calculate total amount before saving
cartSchema.pre('save', async function(next) {
  if (this.isModified('items')) {
    try {
      // Only populate if there are items
      if (this.items.length > 0) {
        await this.populate('items.productId', 'price');
        
        // Filter out items where productId is null (deleted products)
        this.items = this.items.filter(item => item.productId !== null);
        
        this.totalAmount = this.items.reduce((total, item) => {
          const price = parseFloat(item.productId?.price) || 0;
          const quantity = parseInt(item.quantity) || 0;
          return total + (price * quantity);
        }, 0);
      } else {
        this.totalAmount = 0;
      }
    } catch (error) {
      console.error('Error in cart pre-save middleware:', error);
      this.totalAmount = 0;
    }
  }
  next();
});

// Add index for better performance
cartSchema.index({ userId: 1 });
cartSchema.index({ 'items.productId': 1 });

module.exports = mongoose.model('Cart', cartSchema);