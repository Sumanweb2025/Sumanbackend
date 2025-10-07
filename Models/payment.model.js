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
    required: false, // Changed: Allow null for guest orders
    sparse: true
  },
  sessionId: {
    type: String,
    sparse: true,
    index: true
  },
  isGuestOrder: {
    type: Boolean,
    default: false
  },
  orderNumber: {
    type: String,
    required: true
  },
  paymentId: {
    type: String,
    required: true,
    unique: true
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
  stripePaymentId: {
    type: String,
    default: null
  },
  stripePaymentIntentId: {
    type: String,
    default: null
  },
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
  transactionDetails: {
    subtotal: Number,
    tax: Number,
    shipping: Number,
    discount: {
      type: Number,
      default: 0
    },
    firstOrderDiscount: {  
    type: Number,
    default: 0
    },
    total: Number
  },
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

// Indexes
paymentSchema.index({ orderId: 1 });
paymentSchema.index({ userId: 1 });
paymentSchema.index({ sessionId: 1 });
paymentSchema.index({ orderNumber: 1 });
paymentSchema.index({ paymentId: 1 }, { unique: true });
paymentSchema.index({ stripePaymentId: 1 });
paymentSchema.index({ paymentStatus: 1 });
paymentSchema.index({ createdAt: -1 });

paymentSchema.index(
  { stripePaymentId: 1 }, 
  { 
    unique: true, 
    partialFilterExpression: { stripePaymentId: { $ne: null, $exists: true } }
  }
);

paymentSchema.statics.generatePaymentId = function(paymentMethod) {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substr(2, 9);
  
  if (paymentMethod === 'cod') {
    return `COD_${timestamp}_${random}`;
  } else {
    return `CARD_${timestamp}_${random}`;
  }
};

paymentSchema.pre('save', function(next) {
  if (!this.paymentId) {
    this.paymentId = this.constructor.generatePaymentId(this.paymentMethod);
  }
  next();
});

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