const mongoose = require('mongoose');

const cartSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false, // Changed: Allow null for guest users
    sparse: true // Allow multiple null values
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
  },
  expiresAt: {
    type: Date,
    default: () => new Date(+new Date() + 7 * 24 * 60 * 60 * 1000) // 7 days expiry for guest carts
  }
}, {
  timestamps: true
});

// Calculate total amount before saving
cartSchema.pre('save', async function (next) {
  if (this.isModified('items')) {
    try {
      if (this.items.length > 0) {
        await this.populate('items.productId', 'price');

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

// Compound index for guest carts
// Compound index for guest carts - sessionId must be unique for guest users
cartSchema.index({ sessionId: 1 }, { unique: true, sparse: true });

// userId index - sparse allows multiple null values, unique ensures one cart per logged-in user
cartSchema.index({ userId: 1 }, { unique: true, sparse: true });

// Additional indexes for performance
cartSchema.index({ 'items.productId': 1 });
cartSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // Auto-delete expired carts
cartSchema.index({ isGuest: 1, expiresAt: 1 }); // For guest cart cleanup

module.exports = mongoose.model('Cart', cartSchema);