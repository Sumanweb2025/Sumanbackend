const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true
  },
  orderNumber: {
    type: String,
    required: true
  },
  paymentMethod: {
    type: String,
    enum: ['card', 'cod'],
    required: true
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'refunded'],
    default: 'pending'
  },
  amount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'INR'
  },
  stripePaymentIntentId: {
    type: String,
    sparse: true // Only for card payments
  },
  stripePaymentMethodId: {
    type: String,
    sparse: true // Only for card payments
  },
  transactionId: {
    type: String,
    unique: true,
    sparse: true
  },
  // PDF Storage
  documents: {
    orderConfirmation: {
      filename: String,
      path: String,
      url: String,
      createdAt: Date
    },
    invoice: {
      filename: String,
      path: String, 
      url: String,
      createdAt: Date
    },
    bill: {
      filename: String,
      path: String,
      url: String, 
      createdAt: Date
    }
  },
  // Customer Details (for easy access)
  customerDetails: {
    email: String,
    firstName: String,
    lastName: String,
    phone: String,
    address: {
      street: String,
      apartment: String,
      city: String,
      province: String,
      postalCode: String,
      country: String
    }
  },
  // Payment Breakdown
  paymentSummary: {
    subtotal: Number,
    tax: Number,
    shipping: Number,
    discount: {
      type: Number,
      default: 0
    },
    total: Number
  },
  appliedCoupon: {
    code: String,
    discount: Number,
    discountType: String
  },
  // Metadata
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: {}
  },
  // Timestamps
  paidAt: Date,
  failedAt: Date,
  refundedAt: Date
}, {
  timestamps: true
});

// Indexes
paymentSchema.index({ userId: 1 });
paymentSchema.index({ orderId: 1 });
paymentSchema.index({ orderNumber: 1 });
paymentSchema.index({ paymentStatus: 1 });
paymentSchema.index({ stripePaymentIntentId: 1 });
paymentSchema.index({ transactionId: 1 });
paymentSchema.index({ createdAt: -1 });

// Pre-save middleware to generate transaction ID
paymentSchema.pre('save', function(next) {
  if (!this.transactionId && this.isNew) {
    const timestamp = Date.now().toString();
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    this.transactionId = `TXN${timestamp}${random}`;
  }
  next();
});

// Instance Methods
paymentSchema.methods.markAsPaid = function() {
  this.paymentStatus = 'paid';
  this.paidAt = new Date();
  return this.save();
};

paymentSchema.methods.markAsFailed = function() {
  this.paymentStatus = 'failed';
  this.failedAt = new Date();
  return this.save();
};

paymentSchema.methods.addDocument = function(type, filename, filepath, url) {
  this.documents = this.documents || {};
  this.documents[type] = {
    filename,
    path: filepath,
    url,
    createdAt: new Date()
  };
  return this.save();
};

// Static Methods
paymentSchema.statics.findByOrderNumber = function(orderNumber) {
  return this.findOne({ orderNumber });
};

paymentSchema.statics.findByStripePaymentIntent = function(paymentIntentId) {
  return this.findOne({ stripePaymentIntentId: paymentIntentId });
};

paymentSchema.statics.getUserPayments = function(userId, limit = 10) {
  return this.find({ userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('orderId', 'orderNumber status items');
};

module.exports = mongoose.model('Payment', paymentSchema);