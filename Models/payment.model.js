const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  orderNumber: {
    type: String,
    required: true
  },
  // Add a unique payment identifier for all orders
  paymentId: {
    type: String,
    required: true,
    unique: true // This will be our main unique identifier
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
    default: 'CAD'
  },
  // Stripe payment details (only for card payments)
  stripePaymentId: {
    type: String,
    default: null
  },
  stripePaymentIntentId: {
    type: String,
    default: null
  },
  // PDF storage
  pdfs: {
    orderConfirmation: {
      filename: String,
      data: Buffer,
      contentType: {
        type: String,
        default: 'application/pdf'
      },
      createdAt: {
        type: Date,
        default: Date.now
      }
    },
    invoice: {
      filename: String,
      data: Buffer,
      contentType: {
        type: String,
        default: 'application/pdf'
      },
      createdAt: {
        type: Date,
        default: Date.now
      }
    },
    bill: {
      filename: String,
      data: Buffer,
      contentType: {
        type: String,
        default: 'application/pdf'
      },
      createdAt: {
        type: Date,
        default: Date.now
      }
    }
  },
  // Transaction details
  transactionDetails: {
    subtotal: Number,
    tax: Number,
    shipping: Number,
    discount: {
      type: Number,
      default: 0
    },
    total: Number
  },
  // Customer information
  customerInfo: {
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
      country: {
        type: String,
        default: 'Canada'
      }
    }
  },
  // Applied coupon
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
  // Payment processing logs
  paymentLogs: [{
    action: String,
    status: String,
    message: String,
    timestamp: {
      type: Date,
      default: Date.now
    },
    metadata: mongoose.Schema.Types.Mixed
  }],
  // Email delivery status
  emailStatus: {
    orderConfirmationSent: {
      type: Boolean,
      default: false
    },
    invoiceSent: {
      type: Boolean,
      default: false
    },
    billSent: {
      type: Boolean,
      default: false
    },
    adminNotificationSent: {
      type: Boolean,
      default: false
    },
    lastEmailAttempt: Date,
    emailErrors: [String]
  }
}, {
  timestamps: true
});

// Indexes for better query performance (removed unique from stripePaymentId)
paymentSchema.index({ orderId: 1 });
paymentSchema.index({ userId: 1 });
paymentSchema.index({ orderNumber: 1 });
paymentSchema.index({ paymentId: 1 }, { unique: true }); // Main unique identifier
paymentSchema.index({ stripePaymentId: 1 }); // Removed unique constraint
paymentSchema.index({ paymentStatus: 1 });
paymentSchema.index({ createdAt: -1 });

// Create partial unique index for stripePaymentId (only when not null)
paymentSchema.index(
  { stripePaymentId: 1 }, 
  { 
    unique: true, 
    partialFilterExpression: { stripePaymentId: { $ne: null, $exists: true } }
  }
);

// Method to generate unique payment ID
paymentSchema.statics.generatePaymentId = function(paymentMethod) {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substr(2, 9);
  
  if (paymentMethod === 'cod') {
    return `COD_${timestamp}_${random}`;
  } else {
    return `CARD_${timestamp}_${random}`;
  }
};

// Pre-save hook to generate paymentId if not provided
paymentSchema.pre('save', function(next) {
  if (!this.paymentId) {
    this.paymentId = this.constructor.generatePaymentId(this.paymentMethod);
  }
  next();
});

// Method to store PDF in database
paymentSchema.methods.storePDF = function(pdfType, filename, buffer) {
  if (!this.pdfs) {
    this.pdfs = {};
  }
  
  this.pdfs[pdfType] = {
    filename: filename,
    data: buffer,
    contentType: 'application/pdf',
    createdAt: new Date()
  };
  
  return this.save();
};

// Method to get PDF from database
paymentSchema.methods.getPDF = function(pdfType) {
  if (this.pdfs && this.pdfs[pdfType]) {
    return {
      filename: this.pdfs[pdfType].filename,
      data: this.pdfs[pdfType].data,
      contentType: this.pdfs[pdfType].contentType
    };
  }
  return null;
};

// Method to add payment log
paymentSchema.methods.addPaymentLog = function(action, status, message, metadata = {}) {
  this.paymentLogs.push({
    action,
    status,
    message,
    metadata,
    timestamp: new Date()
  });
  return this.save();
};

// Method to update email status
paymentSchema.methods.updateEmailStatus = function(emailType, sent, error = null) {
  if (!this.emailStatus) {
    this.emailStatus = {};
  }
  
  this.emailStatus[emailType] = sent;
  this.emailStatus.lastEmailAttempt = new Date();
  
  if (error) {
    if (!this.emailStatus.emailErrors) {
      this.emailStatus.emailErrors = [];
    }
    this.emailStatus.emailErrors.push(error);
  }
  
  return this.save();
};

module.exports = mongoose.model('Payment', paymentSchema);