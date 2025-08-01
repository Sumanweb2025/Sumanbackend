const Order = require('../Models/order.model');
const Cart = require('../Models/cart.model'); 
const Coupon = require('../Models/coupon.model'); 

// Get order data for checkout
const getCheckoutData = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get cart items
    const cart = await Cart.findOne({ userId }).populate('items.productId');
    
    if (!cart || cart.items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Cart is empty'
      });
    }

    // Calculate totals
    const subtotal = cart.items.reduce((total, item) => {
      return total + (item.productId.price * item.quantity);
    }, 0);

    const tax = subtotal * 0.18; // 18% GST
    const shipping = subtotal > 500 ? 0 : 50;
    const total = subtotal + tax + shipping;

    res.status(200).json({
      success: true,
      data: {
        items: cart.items,
        summary: {
          subtotal: subtotal.toFixed(2),
          tax: tax.toFixed(2),
          shipping: shipping.toFixed(2),
          total: total.toFixed(2)
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

// Apply Coupon Function - NEW
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

    // Find the coupon
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

    // Check if coupon is expired
    const currentDate = new Date();
    if (currentDate < coupon.validFrom || currentDate > coupon.validUntil) {
      return res.status(400).json({
        success: false,
        message: 'Coupon has expired or not yet valid'
      });
    }

    // Check usage limit
    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
      return res.status(400).json({
        success: false,
        message: 'Coupon usage limit exceeded'
      });
    }

    // Get user's cart
    const cart = await Cart.findOne({ userId }).populate('items.productId');
    if (!cart || cart.items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Cart is empty'
      });
    }

    // Calculate cart total
    let subtotal = 0;
    cart.items.forEach(item => {
      subtotal += item.productId.price * item.quantity;
    });

    // Check minimum order amount
    if (subtotal < coupon.minimumOrderAmount) {
      return res.status(400).json({
        success: false,
        message: `Minimum order amount of ₹${coupon.minimumOrderAmount} required for this coupon`
      });
    }

    // Check if user has already used this coupon (optional - implement if needed)
    const existingOrder = await Order.findOne({
      userId,
      'appliedCoupon.code': coupon.code
    });

    if (existingOrder && coupon.userUsageLimit <= 1) {
      return res.status(400).json({
        success: false,
        message: 'You have already used this coupon'
      });
    }

    // Calculate discount
    let discount = 0;
    if (coupon.discountType === 'percentage') {
      discount = (subtotal * coupon.discountValue) / 100;
      // Apply maximum discount limit if set
      if (coupon.maximumDiscountAmount && discount > coupon.maximumDiscountAmount) {
        discount = coupon.maximumDiscountAmount;
      }
    } else if (coupon.discountType === 'fixed') {
      discount = coupon.discountValue;
    }

    // Ensure discount doesn't exceed subtotal
    discount = Math.min(discount, subtotal);

    res.status(200).json({
      success: true,
      message: 'Coupon applied successfully',
      data: {
        code: coupon.code,
        description: coupon.description,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        discount: discount.toFixed(2)
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

// Create new order - UPDATED
const createOrder = async (req, res) => {
  try {
    const userId = req.user.id;
    const { contactInfo, billingAddress, paymentMethod, appliedCoupon } = req.body;

    // Validate required fields
    if (!contactInfo?.email || !billingAddress?.firstName || !billingAddress?.lastName || 
        !billingAddress?.address || !billingAddress?.city || !billingAddress?.province || 
        !billingAddress?.postalCode) {
      return res.status(400).json({
        success: false,
        message: 'All required fields must be filled'
      });
    }

    // Get cart items
    const cart = await Cart.findOne({ userId }).populate('items.productId');
    
    if (!cart || cart.items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Cart is empty'
      });
    }

    // Calculate totals
    const subtotal = cart.items.reduce((total, item) => {
      return total + (item.productId.price * item.quantity);
    }, 0);

    const tax = subtotal * 0.18;
    const shipping = subtotal > 500 ? 0 : 50;
    
    // Apply discount if coupon is provided
    let discount = 0;
    let couponData = null;

    if (appliedCoupon) {
      // Verify coupon again for security
      const coupon = await Coupon.findOne({
        code: appliedCoupon.code.toUpperCase(),
        isActive: true
      });

      if (coupon) {
        const currentDate = new Date();
        if (currentDate >= coupon.validFrom && currentDate <= coupon.validUntil) {
          if (subtotal >= coupon.minimumOrderAmount) {
            if (coupon.discountType === 'percentage') {
              discount = (subtotal * coupon.discountValue) / 100;
              if (coupon.maximumDiscountAmount && discount > coupon.maximumDiscountAmount) {
                discount = coupon.maximumDiscountAmount;
              }
            } else if (coupon.discountType === 'fixed') {
              discount = coupon.discountValue;
            }
            discount = Math.min(discount, subtotal);

            couponData = {
              code: coupon.code,
              description: coupon.description,
              discountType: coupon.discountType,
              discountValue: coupon.discountValue,
              discount: discount
            };

            // Increment coupon usage count
            await Coupon.findByIdAndUpdate(coupon._id, {
              $inc: { usedCount: 1 }
            });
          }
        }
      }
    }

    const total = subtotal + tax + shipping - discount;

    // Prepare order items
    const orderItems = cart.items.map(item => ({
      productId: item.productId._id,
      name: item.productId.name,
      price: item.productId.price,
      quantity: item.quantity,
      image: item.productId.image || item.productId.imageUrl,
      brand: item.productId.brand,
      category: item.productId.category
    }));

    // Generate order number manually
    const timestamp = Date.now().toString();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    const orderNumber = `ORD${timestamp}${random}`;

    // Create order
    const order = new Order({
      userId,
      orderNumber,
      items: orderItems,
      contactInfo,
      billingAddress,
      paymentMethod: paymentMethod || 'COD',
      appliedCoupon: couponData,
      orderSummary: {
        subtotal,
        tax,
        shipping,
        discount,
        total
      }
    });

    await order.save();

    // Clear cart after successful order
    await Cart.findOneAndUpdate(
      { userId },
      { $set: { items: [] } }
    );

    res.status(201).json({
      success: true,
      message: 'Order placed successfully!',
      data: {
        orderNumber: order.orderNumber,
        orderId: order._id,
        total: total.toFixed(2)
      }
    });

  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to place order. Please try again.'
    });
  }
};

// Get user orders
const getUserOrders = async (req, res) => {
  try {
    const userId = req.user.id;
    const orders = await Order.find({ userId })
      .populate('items.productId')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: orders
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
      .populate('items.productId');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    res.status(200).json({
      success: true,
      data: order
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
    const { status, paymentStatus } = req.body;

    const order = await Order.findById(orderId);
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    if (status) order.status = status;
    if (paymentStatus) order.paymentStatus = paymentStatus;

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

// Get all available coupons - NEW
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

module.exports = {
  getCheckoutData,
  applyCoupon, // NEW
  createOrder,
  getUserOrders,
  getOrderById,
  updateOrderStatus,
  getAvailableCoupons // NEW
};