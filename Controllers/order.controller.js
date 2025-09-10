const Order = require('../Models/order.model');
const Cart = require('../Models/cart.model'); 
const Coupon = require('../Models/coupon.model'); 
const Payment = require('../Models/payment.model'); // ADD THIS
const Refund = require('../Models/refund.model'); // ADD THIS
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY); // ADD THIS
const EmailService = require('../Services/mailer.js'); // ADD THIS

// Initialize email service - ADD THIS
const emailService = new EmailService();

// Helper function to add imageUrl to product and ensure price is a number
const addImageUrlToProduct = (product, req) => {
  if (!product) return product;
  
  const productObj = product.toObject ? product.toObject() : product;
  return {
    ...productObj,
    imageUrl: productObj.image ? `${req.protocol}://${req.get('host')}/images/Products/${productObj.image}` : null,
    price: parseFloat(productObj.price) || 0
  };
};

// Helper function to safely parse numbers
const safeParseFloat = (value) => {
  const parsed = parseFloat(value);
  return isNaN(parsed) ? 0 : parsed;
};

const safeParseInt = (value) => {
  const parsed = parseInt(value);
  return isNaN(parsed) ? 0 : parsed;
};

// Get order data for checkout
const getCheckoutData = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const cart = await Cart.findOne({ userId }).populate({
      path: 'items.productId',
      select: 'name price image description category brand'
    });
    
    if (!cart || cart.items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Cart is empty'
      });
    }

    const cartItemsWithImageUrls = cart.items.map(item => ({
      ...item.toObject(),
      quantity: safeParseInt(item.quantity),
      productId: addImageUrlToProduct(item.productId, req)
    }));

    const subtotal = cartItemsWithImageUrls.reduce((total, item) => {
      const price = safeParseFloat(item.productId.price);
      const quantity = safeParseInt(item.quantity);
      return total + (price * quantity);
    }, 0);

    // Canadian tax and shipping rates
    const tax = subtotal * 0.13; // 13% HST for most Canadian provinces
    const shipping = subtotal >= 75 ? 0 : 9.99; // Free shipping over $75
    const total = subtotal + tax + shipping;

    res.status(200).json({
      success: true,
      data: {
        items: cartItemsWithImageUrls,
        summary: {
          subtotal: subtotal.toFixed(2),
          tax: tax.toFixed(2),
          shipping: shipping.toFixed(2),
          total: total.toFixed(2),
          currency: 'CAD'
        }
      }
    });
  } catch (error) {
    console.error('Error getting checkout data:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// Apply Coupon Function
const applyCoupon = async (req, res) => {
  try {
    const { couponCode } = req.body;
    const userId = req.user.id;

    if (!couponCode) {
      return res.status(400).json({
        success: false,
        message: 'Coupon code is required'
      });
    }

    const coupon = await Coupon.findOne({
      code: couponCode.toUpperCase(),
      isActive: true
    });

    if (!coupon) {
      return res.status(400).json({
        success: false,
        message: 'Invalid coupon code'
      });
    }

    const currentDate = new Date();
    if (currentDate < coupon.validFrom || currentDate > coupon.validUntil) {
      return res.status(400).json({
        success: false,
        message: 'Coupon has expired or not yet valid'
      });
    }

    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
      return res.status(400).json({
        success: false,
        message: 'Coupon usage limit exceeded'
      });
    }

    const cart = await Cart.findOne({ userId }).populate({
      path: 'items.productId',
      select: 'name price image description category brand'
    });
    
    if (!cart || cart.items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Cart is empty'
      });
    }

    let subtotal = 0;
    cart.items.forEach(item => {
      const price = safeParseFloat(item.productId.price);
      const quantity = safeParseInt(item.quantity);
      subtotal += price * quantity;
    });

    if (subtotal < coupon.minimumOrderAmount) {
      return res.status(400).json({
        success: false,
        message: `Minimum order amount of $${coupon.minimumOrderAmount} required for this coupon`
      });
    }

    let discount = 0;
    if (coupon.discountType === 'percentage') {
      discount = (subtotal * coupon.discountValue) / 100;
      if (coupon.maximumDiscountAmount && discount > coupon.maximumDiscountAmount) {
        discount = coupon.maximumDiscountAmount;
      }
    } else if (coupon.discountType === 'fixed') {
      discount = coupon.discountValue;
    }

    discount = Math.min(discount, subtotal);

    res.status(200).json({
      success: true,
      message: 'Coupon applied successfully',
      data: {
        code: coupon.code,
        description: coupon.description,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        discount: discount.toFixed(2),
        currency: 'CAD'
      }
    });

  } catch (error) {
    console.error('Error applying coupon:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// Get user orders
const getUserOrders = async (req, res) => {
  try {
    const userId = req.user.id;
    const orders = await Order.find({ userId })
      .populate({
        path: 'items.productId',
        select: 'name price image description category brand'
      })
      .sort({ createdAt: -1 });

    const ordersWithImageUrls = orders.map(order => {
      const orderObj = order.toObject();
      return {
        ...orderObj,
        items: orderObj.items.map(item => ({
          ...item,
          imageUrl: item.imageUrl || (item.image ? `${req.protocol}://${req.get('host')}/images/Products/${item.image}` : null),
          price: safeParseFloat(item.price),
          quantity: safeParseInt(item.quantity)
        }))
      };
    });

    res.status(200).json({
      success: true,
      data: ordersWithImageUrls
    });
  } catch (error) {
    console.error('Error getting user orders:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// Get single order by ID
const getOrderById = async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user.id;

    const order = await Order.findOne({ _id: orderId, userId })
      .populate({
        path: 'items.productId',
        select: 'name price image description category brand'
      });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    const orderObj = order.toObject();
    const orderWithImageUrls = {
      ...orderObj,
      items: orderObj.items.map(item => ({
        ...item,
        imageUrl: item.imageUrl || (item.image ? `${req.protocol}://${req.get('host')}/images/Products/${item.image}` : null),
        price: safeParseFloat(item.price),
        quantity: safeParseInt(item.quantity)
      }))
    };

    res.status(200).json({
      success: true,
      data: orderWithImageUrls
    });
  } catch (error) {
    console.error('Error getting order:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// Update order status (admin only)
const updateOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;

    const order = await Order.findById(orderId).populate({
      path: 'items.productId',
      select: 'name price image description category brand'
    });
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    if (status) order.status = status;
    await order.save();

    res.status(200).json({
      success: true,
      message: 'Order updated successfully',
      data: order
    });
  } catch (error) {
    console.error('Error updating order:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// Get all available coupons
const getAvailableCoupons = async (req, res) => {
  try {
    const currentDate = new Date();
    
    const coupons = await Coupon.find({
      isActive: true,
      validFrom: { $lte: currentDate },
      validUntil: { $gte: currentDate },
      $or: [
        { usageLimit: null },
        { $expr: { $lt: ['$usedCount', '$usageLimit'] } }
      ]
    }).select('code description discountType discountValue minimumOrderAmount maximumDiscountAmount validUntil');

    res.status(200).json({
      success: true,
      data: coupons
    });
  } catch (error) {
    console.error('Error getting available coupons:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// Track Order
const trackOrder = async (req, res) => {
  try {
    const { orderId, email } = req.body;

    if (!orderId || !email) {
      return res.status(400).json({
        success: false,
        message: 'Order ID and email are required'
      });
    }

    const order = await Order.findOne({ 
      orderNumber: orderId.trim(), 
      'contactInfo.email': email.trim().toLowerCase() 
    }).populate({
      path: 'items.productId',
      select: 'name price image description category brand'
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found. Please check your Order ID and email.'
      });
    }

    const orderObj = order.toObject();
    const itemsWithImageUrls = orderObj.items.map(item => ({
      ...item,
      imageUrl: item.imageUrl || (item.image ? `${req.protocol}://${req.get('host')}/images/Products/${item.image}` : null),
      price: safeParseFloat(item.price),
      quantity: safeParseInt(item.quantity)
    }));

    res.status(200).json({
      success: true,
      data: {
        orderNumber: order.orderNumber,
        status: order.status,
        paymentStatus: order.paymentStatus,
        paymentMethod: order.paymentMethod,
        total: order.orderSummary.total,
        subtotal: order.orderSummary.subtotal,
        tax: order.orderSummary.tax,
        shipping: order.orderSummary.shipping,
        discount: order.orderSummary.discount || 0,
        appliedCoupon: order.appliedCoupon,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        items: itemsWithImageUrls,
        contactInfo: order.contactInfo,
        billingAddress: order.billingAddress,
        currency: 'CAD'
      }
    });

  } catch (error) {
    console.error('Error tracking order:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while tracking order'
    });
  }
};

// Get all orders (admin only)
const getAllOrders = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, paymentStatus, search } = req.query;
    
    const query = {};
    
    if (status) query.status = status;
    if (paymentStatus) query.paymentStatus = paymentStatus;
    if (search) {
      query.$or = [
        { orderNumber: { $regex: search, $options: 'i' } },
        { 'contactInfo.email': { $regex: search, $options: 'i' } },
        { 'billingAddress.firstName': { $regex: search, $options: 'i' } },
        { 'billingAddress.lastName': { $regex: search, $options: 'i' } }
      ];
    }

    const orders = await Order.find(query)
      .populate('userId', 'firstName lastName email')
      .populate({
        path: 'items.productId',
        select: 'name price image'
      })
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Order.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        orders,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        total
      }
    });
  } catch (error) {
    console.error('Error getting all orders:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// Get order statistics (admin only)
const getOrderStatistics = async (req, res) => {
  try {
    const { period = '30d' } = req.query;
    
    let startDate = new Date();
    switch (period) {
      case '7d':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(startDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(startDate.getDate() - 90);
        break;
      case '1y':
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
    }

    // Total orders
    const totalOrders = await Order.countDocuments({
      createdAt: { $gte: startDate }
    });

    // Total revenue
    const totalRevenue = await Order.aggregate([
      {
        $match: {
          paymentStatus: 'paid',
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$orderSummary.total' }
        }
      }
    ]);

    // Order status breakdown
    const statusStats = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Payment method breakdown
    const paymentMethodStats = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$paymentMethod',
          count: { $sum: 1 },
          revenue: { $sum: '$orderSummary.total' }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalOrders,
        totalRevenue: totalRevenue[0]?.total || 0,
        statusStats,
        paymentMethodStats,
        period,
        currency: 'CAD'
      }
    });

  } catch (error) {
    console.error('Error getting order statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

const cancelOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { reason } = req.body; // Get reason from request body
    const userId = req.user.id;

    // Find the order
    const order = await Order.findOne({ _id: orderId, userId }).populate({
      path: 'items.productId',
      select: 'name price image description category brand'
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check if order can be cancelled
    const cancellationCheck = order.canBeCancelled();
    if (!cancellationCheck.canCancel) {
      return res.status(400).json({
        success: false,
        message: cancellationCheck.reason
      });
    }

    // Find corresponding payment record
    const payment = await Payment.findOne({ orderId: order._id });
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment record not found'
      });
    }

    let refundResult = null;
    let refund = null;

    try {
      // Step 1: Update order status first
      await Order.findByIdAndUpdate(orderId, {
        status: 'cancelled',
        cancellationReason: reason || 'Customer requested cancellation',
        cancelledAt: new Date(),
        cancelledBy: userId
      });

      // Step 2: Handle refund if payment was online (card)
      if (order.paymentMethod === 'card' && order.paymentStatus === 'paid') {
        // Process Stripe refund
        refundResult = await processStripeRefund(order, payment, reason);
        
        // Create refund record
        refund = new Refund({
          orderId: order._id,
          paymentId: payment._id,
          userId: userId,
          orderNumber: order.orderNumber,
          paymentMethod: 'card',
          refundAmount: order.orderSummary.total,
          refundReason: reason || 'Customer requested cancellation',
          refundStatus: refundResult.status,
          stripeRefundId: refundResult.refundId,
          stripeRefundObject: refundResult.stripeObject,
          customerInfo: {
            email: order.contactInfo.email,
            firstName: order.billingAddress.firstName,
            lastName: order.billingAddress.lastName,
            phone: order.billingAddress.phone
          }
        });

        await refund.save();

        // Step 3: Update order with refund details
        await Order.findByIdAndUpdate(orderId, {
          refundStatus: refundResult.status,
          refundAmount: refundResult.amount,
          refundId: refund._id
        });

        // Step 4: Update payment status
        await Payment.findByIdAndUpdate(payment._id, {
          paymentStatus: 'refunded'
        });

        // Step 5: Log refund creation
        if (refund) {
          await refund.addRefundLog(
            'REFUND_INITIATED',
            refundResult.status.toUpperCase(),
            'Refund initiated due to order cancellation',
            { 
              stripeRefundId: refundResult.refundId,
              amount: refundResult.amount
            }
          );
        }
      }

      // Step 6: Send cancellation emails
      await sendCancellationEmails(order, refundResult, req.user);

      // Step 7: Return success response
      res.status(200).json({
        success: true,
        message: 'Order cancelled successfully',
        data: {
          orderId: order._id,
          orderNumber: order.orderNumber,
          status: 'cancelled',
          refundInfo: order.paymentMethod === 'card' ? refundResult : null
        }
      });

    } catch (processingError) {
      console.error('Error during cancellation processing:', processingError);
      
      // If there was an error after updating order status, 
      // we should revert the order status back
      try {
        await Order.findByIdAndUpdate(orderId, {
          status: order.status, // Revert to original status
          cancellationReason: null,
          cancelledAt: null,
          cancelledBy: null
        });
      } catch (revertError) {
        console.error('Error reverting order status:', revertError);
      }

      throw processingError;
    }

  } catch (error) {
    console.error('Error cancelling order:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while cancelling order'
    });
  }
};

// ADD THIS NEW HELPER FUNCTION
const processStripeRefund = async (order, payment, reason) => {
  try {
    const refund = await stripe.refunds.create({
      payment_intent: payment.stripePaymentIntentId,
      amount: Math.round(order.orderSummary.total * 100), // Convert to cents
      reason: 'requested_by_customer',
      metadata: {
        order_id: order._id.toString(),
        order_number: order.orderNumber,
        cancellation_reason: reason || 'Customer requested cancellation'
      }
    });

    return {
      status: 'processing',
      amount: order.orderSummary.total,
      refundId: refund.id,
      stripeObject: refund
    };
  } catch (error) {
    console.error('Stripe refund error:', error);
    return {
      status: 'failed',
      amount: order.orderSummary.total,
      refundId: null,
      stripeObject: null,
      error: error.message
    };
  }
};

// ADD THIS NEW HELPER FUNCTION
const sendCancellationEmails = async (order, refundInfo, user) => {
  try {
    if (order.paymentMethod === 'cod') {
      // Send COD cancellation email
      await emailService.sendCODCancellationEmail(order, user);
    } else if (order.paymentMethod === 'card') {
      // Send card cancellation with refund info email
      await emailService.sendCardCancellationEmail(order, refundInfo, user);
    }

    // Send admin notification
    await emailService.sendAdminCancellationNotification(order, refundInfo, user);
    
  } catch (emailError) {
    console.error('Error sending cancellation emails:', emailError);
    // Don't throw error to prevent cancellation failure
  }
};

module.exports = {
  getCheckoutData,
  applyCoupon,
  getUserOrders,
  getOrderById,
  updateOrderStatus,
  getAvailableCoupons,
  trackOrder,
  getAllOrders,
  getOrderStatistics,
  cancelOrder, // Updated function
  processStripeRefund, // New function
  sendCancellationEmails // New function
};