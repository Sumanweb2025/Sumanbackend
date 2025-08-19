const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  orderNumber: {
    type: String,
    unique: true
  },
  items: [{
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    name: {
      type: String,
      required: true
    },
    price: {
      type: Number,
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    image: String,
    imageUrl: String, // Added for storing full image URL
    brand: String,
    category: String
  }],
  contactInfo: {
    email: {
      type: String,
      required: true
    }
  },
  billingAddress: {
    firstName: {
      type: String,
      required: true
    },
    lastName: {
      type: String,
      required: true
    },
    address: {
      type: String,
      required: true
    },
    apartment: String,
    city: {
      type: String,
      required: true
    },
    province: {
      type: String,
      required: true
    },
    postalCode: {
      type: String,
      required: true
    },
    country: {
      type: String,
      required: true,
      default: 'India'
    },
    phone: String
  },
  // Applied coupon information
  appliedCoupon: {
    code: String,
    description: String,
    discountType: {
      type: String,
      enum: ['percentage', 'fixed']
    },
    discountValue: Number,
    discount: {
      type: Number,
      default: 0
    }
  },
  orderSummary: {
    subtotal: {
      type: Number,
      required: true
    },
    tax: {
      type: Number,
      required: true
    },
    shipping: {
      type: Number,
      required: true
    },
    discount: {
      type: Number,
      default: 0
    },
    total: {
      type: Number,
      required: true
    }
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'],
    default: 'pending'
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'refunded'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    enum: ['card', 'upi','netbanking','cod'],
    default: 'cod'
  },
  // NEW: Stripe payment integration fields
  stripePaymentId: {
    type: String,
    default: null
  },
  stripePaymentIntentId: {
    type: String,
    default: null
  },
  // Additional tracking fields
  trackingNumber: {
    type: String,
    default: null
  },
  estimatedDeliveryDate: {
    type: Date,
    default: null
  },
  notes: {
    type: String,
    default: null
  }
}, {
  timestamps: true
});

// Generate order number before saving
orderSchema.pre('save', async function(next) {
  if (!this.orderNumber) {
    const timestamp = Date.now().toString();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    this.orderNumber = `ORD${timestamp}${random}`;
  }
  next();
});

// Index for better query performance
orderSchema.index({ userId: 1, createdAt: -1 });
orderSchema.index({ orderNumber: 1 });
orderSchema.index({ 'contactInfo.email': 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ paymentStatus: 1 });

module.exports = mongoose.model('Order', orderSchema);