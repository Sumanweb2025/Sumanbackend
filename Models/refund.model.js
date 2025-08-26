// Models/refund.model.js - NEW FILE
const mongoose = require('mongoose');

const refundSchema = new mongoose.Schema({
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true
  },
  paymentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Payment',
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
  paymentMethod: {
    type: String,
    enum: ['card', 'cod'],
    required: true
  },
  refundAmount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'CAD'
  },
  refundStatus: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending'
  },
  refundReason: {
    type: String,
    required: true
  },
  // Stripe refund details (for card payments)
  stripeRefundId: {
    type: String,
    default: null
  },
  stripeRefundObject: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  // Admin processing details
  processedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  processedAt: {
    type: Date,
    default: null
  },
  // Customer information
  customerInfo: {
    email: String,
    firstName: String,
    lastName: String,
    phone: String
  },
  // Refund processing logs
  refundLogs: [{
    action: String,
    status: String,
    message: String,
    timestamp: {
      type: Date,
      default: Date.now
    },
    metadata: mongoose.Schema.Types.Mixed
  }],
  // Email notifications
  emailStatus: {
    refundInitiatedSent: {
      type: Boolean,
      default: false
    },
    refundCompletedSent: {
      type: Boolean,
      default: false
    },
    adminNotificationSent: {
      type: Boolean,
      default: false
    }
  },
  notes: {
    type: String,
    default: null
  }
}, {
  timestamps: true
});

// Indexes for better query performance
refundSchema.index({ orderId: 1 });
refundSchema.index({ paymentId: 1 });
refundSchema.index({ userId: 1 });
refundSchema.index({ orderNumber: 1 });
refundSchema.index({ refundStatus: 1 });
refundSchema.index({ stripeRefundId: 1 },{ 
    unique: true, 
    sparse: true // This allows multiple null values
  });
refundSchema.index({ createdAt: -1 });

// Method to add refund log
refundSchema.methods.addRefundLog = function(action, status, message, metadata = {}) {
  this.refundLogs.push({
    action,
    status,
    message,
    metadata,
    timestamp: new Date()
  });
  return this.save();
};

// Method to update email status
refundSchema.methods.updateEmailStatus = function(emailType, sent) {
  if (!this.emailStatus) {
    this.emailStatus = {};
  }
  this.emailStatus[emailType] = sent;
  return this.save();
};

module.exports = mongoose.model('Refund', refundSchema);