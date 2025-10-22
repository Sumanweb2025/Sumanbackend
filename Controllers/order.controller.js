const Order = require('../Models/order.model');
const Cart = require('../Models/cart.model');
const Coupon = require('../Models/coupon.model');
const Payment = require('../Models/payment.model');
const Refund = require('../Models/refund.model');
const Product = require('../Models/product.model');
const Offer = require('../Models/offer.model');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const EmailService = require('../Services/mailer.js');
const { v4: uuidv4 } = require('uuid');

const emailService = new EmailService();

// Helper function to get session ID
const getSessionId = (req) => {
  return req.header('X-Session-ID') || req.body.sessionId;
};

// Helper function to check if product is eligible for offer
const isProductEligibleForOffer = (offer, product) => {
  if (!offer || !product) return false;

  const productId = product._id || product.product_id;

  // Check if offer is active and within date range
  const now = new Date();
  const startDate = new Date(offer.startDate);
  const endDate = new Date(offer.endDate);

  if (!offer.isActive || now < startDate || now > endDate) {
    return false;
  }

  // Priority 1: Check specific products
  if (offer.applicableProducts && offer.applicableProducts.length > 0) {
    return offer.applicableProducts.some(p => {
      const offerProductId = typeof p === 'object' ? (p.product_id || p._id) : p;
      return String(offerProductId) === String(productId);
    });
  }

  // Priority 2: Check categories
  if (offer.applicableCategories && offer.applicableCategories.length > 0) {
    return offer.applicableCategories.some(
      cat => cat.toLowerCase() === (product.category || '').toLowerCase()
    );
  }

  // Priority 3: Apply to all
  return true;
};

// Helper function to calculate discounted price
const calculateDiscountedPrice = (offer, originalPrice) => {
  if (!offer || !originalPrice) return originalPrice;

  let discountedPrice = originalPrice;

  if (offer.discountType === 'percentage') {
    const discountAmount = (originalPrice * offer.discount) / 100;
    discountedPrice = originalPrice - discountAmount;
  } else if (offer.discountType === 'fixed') {
    discountedPrice = originalPrice - offer.discount;
  }

  return Math.max(0, discountedPrice);
};

// Helper function to add imageUrl to product
const addImageUrlToProduct = (product, req) => {
  if (!product) return product;

  const productObj = product.toObject ? product.toObject() : product;

  // Fix: Handle image as array and extract first image
  const imageValue = Array.isArray(productObj.image)
    ? productObj.image[0]
    : productObj.image;

  return {
    ...productObj,
    image: imageValue, // Store single image string
    imageUrl: imageValue
      ? `${req.protocol}://${req.get('host')}/images/Products/${imageValue}`
      : null,
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

// Helper function to restore inventory stock when order is cancelled
const restoreInventoryStock = async (orderItems) => {
  const stockRestorations = [];

  try {
    for (const item of orderItems) {
      const product = await Product.findById(item.productId);

      if (!product) {
        console.warn(`⚠️ Product ${item.name} not found in inventory during cancellation. Skipping stock restoration.`);
        continue;
      }

      // Restore stock
      const oldStock = product.piece;
      product.piece += item.quantity;
      await product.save();

      stockRestorations.push({
        productId: product._id,
        productName: product.name,
        oldStock,
        newStock: product.piece,
        restoredBy: item.quantity
      });

      //console.log(`Stock restored for ${product.name}: ${oldStock} → ${product.piece} (Returned: ${item.quantity})`);
    }

    return { success: true, restorations: stockRestorations };

  } catch (error) {
    console.error('Error restoring inventory during cancellation:', error);
    throw error;
  }
};

// Get checkout data (supports guest users)
const getCheckoutData = async (req, res) => {
  try {
    const { isGuest, userId } = req.user;
    let cart;

    if (isGuest) {
      const sessionId = getSessionId(req);
      if (!sessionId) {
        return res.status(400).json({
          success: false,
          message: 'Session ID required for guest checkout'
        });
      }

      cart = await Cart.findOne({ sessionId, isGuest: true }).populate({
        path: 'items.productId',
        select: 'name price image description category brand product_id _id'
      });
    } else {
      cart = await Cart.findOne({ userId }).populate({
        path: 'items.productId',
        select: 'name price image description category brand product_id _id'
      });
    }

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Cart is empty'
      });
    }

    // Fetch active offer
    let activeOffer = null;
    try {
      activeOffer = await Offer.findOne({
        isActive: true,
        startDate: { $lte: new Date() },
        endDate: { $gte: new Date() }
      });
    } catch (offerError) {
      console.log('No active offer found:', offerError);
    }

    const cartItemsWithImageUrls = cart.items.map(item => ({
      ...item.toObject(),
      quantity: safeParseInt(item.quantity),
      productId: addImageUrlToProduct(item.productId, req)
    }));


    // Calculate subtotal WITH offer discounts
    let offerSavings = 0;
    const subtotal = cartItemsWithImageUrls.reduce((total, item) => {
      const price = safeParseFloat(item.productId.price);
      const quantity = safeParseInt(item.quantity);
      // Check if product is eligible for offer
      if (activeOffer && isProductEligibleForOffer(activeOffer, item.productId)) {
        const discountedPrice = calculateDiscountedPrice(activeOffer, price);
        const savedAmount = (price - discountedPrice) * quantity;
        offerSavings += savedAmount;
        return total + (discountedPrice * quantity);
      }
      return total + (price * quantity);
    }, 0);

    const tax = subtotal * 0.13;
    const shipping = subtotal >= 75 ? 0 : 9.99;

    // Check for first order discount
    let firstOrderDiscount = 0;
    if (userId && !isGuest) {
      const previousOrders = await Order.countDocuments({
        userId,
        paymentStatus: { $in: ['paid', 'pending'] }
      });

      if (previousOrders === 0) {
        firstOrderDiscount = subtotal * 0.02; // 2% discount
      }
    }

    const total = subtotal + tax + shipping - firstOrderDiscount;

    res.status(200).json({
      success: true,
      data: {
        items: cartItemsWithImageUrls,
        summary: {
          subtotal: subtotal.toFixed(2),
          tax: tax.toFixed(2),
          shipping: shipping.toFixed(2),
          offerSavings: offerSavings.toFixed(2),
          firstOrderDiscount: firstOrderDiscount.toFixed(2),
          total: total.toFixed(2),
          currency: 'CAD'
        },
        activeOffer: activeOffer,
        sessionId: isGuest ? cart.sessionId : null
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

// Apply coupon (supports guest users)
const applyCoupon = async (req, res) => {
  try {
    const { couponCode } = req.body;
    const { isGuest, userId } = req.user;

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

    let cart;
    if (isGuest) {
      const sessionId = getSessionId(req);
      cart = await Cart.findOne({ sessionId, isGuest: true }).populate({
        path: 'items.productId',
        select: 'name price image description category brand'
      });
    } else {
      cart = await Cart.findOne({ userId }).populate({
        path: 'items.productId',
        select: 'name price image description category brand'
      });
    }

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

// Get user orders (only for logged-in users)
const getUserOrders = async (req, res) => {
  try {
    const { isGuest, userId } = req.user;

    if (isGuest) {
      return res.status(401).json({
        success: false,
        message: 'Please login to view your orders'
      });
    }

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
        items: orderObj.items.map(item => {
          // Handle array image
          const imageValue = Array.isArray(item.image) ? item.image[0] : item.image;
          return {
            ...item,
            image: imageValue,
            imageUrl: item.imageUrl || (imageValue ? `${req.protocol}://${req.get('host')}/images/Products/${imageValue}` : null),
            price: safeParseFloat(item.price),
            quantity: safeParseInt(item.quantity)
          };
        })
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
    const { isGuest, userId } = req.user;

    if (isGuest) {
      return res.status(401).json({
        success: false,
        message: 'Please login to view order details'
      });
    }

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
      items: orderObj.items.map(item => {
        // Handle array image
        const imageValue = Array.isArray(item.image) ? item.image[0] : item.image;
        return {
          ...item,
          image: imageValue,
          imageUrl: item.imageUrl || (imageValue ? `${req.protocol}://${req.get('host')}/images/Products/${imageValue}` : null),
          price: safeParseFloat(item.price),
          quantity: safeParseInt(item.quantity)
        };
      })
    };

    res.status(200).json({
      success: true,
      data: orderWithImageUrls
    });
  } catch (error) {
    console.error('Error getting order:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting order'
    });
  }
};

// Update order status (admin only)
const updateOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status, trackingNumber, estimatedDeliveryDate } = req.body;

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

    const oldStatus = order.status;

    // Update order fields

    if (status) order.status = status;
     if (trackingNumber) order.trackingNumber = trackingNumber;
    if (estimatedDeliveryDate) order.estimatedDeliveryDate = estimatedDeliveryDate;
    await order.save();

    // Send email notification to customer if status changed
    if (status && status !== oldStatus) {
      try {
        // Prepare items for email
        const items = order.items.map(item => ({
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          image: item.image
        }));

        // Send email notification for specific status changes
        if (status === 'processing' || status === 'shipped' || status === 'delivered') {
          await emailService.sendOrderStatusUpdateEmail(order, items, status);
          console.log(`✅ Status update email sent to customer for order ${order.orderNumber} - Status: ${status}`);
        }

        // Notify admin when an order is delivered (and optionally when shipped)
        if (status === 'delivered') {
          try {
            await emailService.sendAdminNotificationEmail(order, items);
            console.log(`📧 Admin notified: Order ${order.orderNumber} marked as DELIVERED`);
          } catch (adminNotifyErr) {
            console.error('⚠️ Failed to notify admin about delivery:', adminNotifyErr);
          }
        }
      } catch (emailError) {
        console.error('❌ Error sending status update email:', emailError);
        // Don't fail the request if email fails
      }
    }

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

// Get available coupons
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

// Track order (public - supports guest orders)
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
    const itemsWithImageUrls = orderObj.items.map(item => {
      // Handle array image
      const imageValue = Array.isArray(item.image) ? item.image[0] : item.image;
      return {
        ...item,
        image: imageValue,
        imageUrl: item.imageUrl || (imageValue ? `${req.protocol}://${req.get('host')}/images/Products/${imageValue}` : null),
        price: safeParseFloat(item.price),
        quantity: safeParseInt(item.quantity)
      };
    });

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
        isGuestOrder: order.isGuestOrder || false,
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
      .populate('userId', 'name email')
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

    const totalOrders = await Order.countDocuments({
      createdAt: { $gte: startDate }
    });

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

// Cancel order
const cancelOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { reason } = req.body;
    const { isGuest, userId } = req.user;

    if (isGuest) {
      return res.status(401).json({
        success: false,
        message: 'Please login to cancel orders'
      });
    }

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

    const cancellationCheck = order.canBeCancelled();
    if (!cancellationCheck.canCancel) {
      return res.status(400).json({
        success: false,
        message: cancellationCheck.reason
      });
    }

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
      await Order.findByIdAndUpdate(orderId, {
        status: 'cancelled',
        cancellationReason: reason || 'Customer requested cancellation',
        cancelledAt: new Date(),
        cancelledBy: userId
      });

      if (order.paymentMethod === 'card' && order.paymentStatus === 'paid') {
        refundResult = await processStripeRefund(order, payment, reason);

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

        await Order.findByIdAndUpdate(orderId, {
          refundStatus: refundResult.status,
          refundAmount: refundResult.amount,
          refundId: refund._id
        });

        await Payment.findByIdAndUpdate(payment._id, {
          paymentStatus: 'refunded'
        });

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
      } else if (order.paymentMethod === 'cod') {
        // Update payment status to cancelled for COD orders
        await Payment.findByIdAndUpdate(payment._id, {
          paymentStatus: 'cancelled'
        });
      }

      // Restore inventory stock for cancelled order items
      try {
        const stockRestoration = await restoreInventoryStock(order.items);
        //console.log(`Inventory restored successfully for cancelled order ${order.orderNumber}:`, stockRestoration.restorations.length, 'products updated');

        // Update order with stock restoration info
        await Order.findByIdAndUpdate(orderId, {
          $set: {
            notes: order.notes
              ? `${order.notes}\n\nStock restored: ${stockRestoration.restorations.length} products returned to inventory.`
              : `Stock restored: ${stockRestoration.restorations.length} products returned to inventory.`
          }
        });
      } catch (stockError) {
        console.error('Error restoring inventory for cancelled order:', stockError);
        // Don't fail the cancellation if stock restoration fails
        // Log it for manual review
        await Order.findByIdAndUpdate(orderId, {
          $set: {
            notes: order.notes
              ? `${order.notes}\n\nWARNING: Stock restoration failed. Please manually restore inventory. Error: ${stockError.message}`
              : `WARNING: Stock restoration failed. Please manually restore inventory. Error: ${stockError.message}`
          }
        });
      }

      // Fetch the updated order with cancelledAt field for email
      const updatedOrder = await Order.findById(orderId).populate({
        path: 'items.productId',
        select: 'name price image description category brand'
      });

      await sendCancellationEmails(updatedOrder, refundResult, req.user);

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

      try {
        await Order.findByIdAndUpdate(orderId, {
          status: order.status,
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

const processStripeRefund = async (order, payment, reason) => {
  try {
    const refund = await stripe.refunds.create({
      payment_intent: payment.stripePaymentIntentId,
      amount: Math.round(order.orderSummary.total * 100),
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

const sendCancellationEmails = async (order, refundInfo, user) => {
  try {
    if (order.paymentMethod === 'cod') {
      await emailService.sendCODCancellationEmail(order, user);
    } else if (order.paymentMethod === 'card') {
      await emailService.sendCardCancellationEmail(order, refundInfo, user);
    }

    await emailService.sendAdminCancellationNotification(order, refundInfo, user);

  } catch (emailError) {
    console.error('Error sending cancellation emails:', emailError);
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
  cancelOrder,
  processStripeRefund,
  sendCancellationEmails
};