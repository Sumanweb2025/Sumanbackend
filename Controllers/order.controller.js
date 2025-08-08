const Order = require('../Models/order.model');
const Cart = require('../Models/cart.model'); 
const Coupon = require('../Models/coupon.model'); 

// Helper function to add imageUrl to product and ensure price is a number
const addImageUrlToProduct = (product, req) => {
  if (!product) return product;
  
  const productObj = product.toObject ? product.toObject() : product;
  return {
    ...productObj,
    imageUrl: productObj.image ? `${req.protocol}://${req.get('host')}/images/Products/${productObj.image}` : null,
    price: parseFloat(productObj.price) || 0 // Ensure price is always a number
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
    
    // Get cart items
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

    // Add imageUrl to each product and ensure proper data types
    const cartItemsWithImageUrls = cart.items.map(item => ({
      ...item.toObject(),
      quantity: safeParseInt(item.quantity),
      productId: addImageUrlToProduct(item.productId, req)
    }));

    // Calculate totals with safe parsing
    const subtotal = cartItemsWithImageUrls.reduce((total, item) => {
      const price = safeParseFloat(item.productId.price);
      const quantity = safeParseInt(item.quantity);
      return total + (price * quantity);
    }, 0);

    const tax = subtotal * 0.13; 
   const shipping = subtotal > 75 ? 0 : 15; 
    const total = subtotal + tax + shipping;

    res.status(200).json({
      success: true,
      data: {
        items: cartItemsWithImageUrls,
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

// Apply Coupon Function - UPDATED
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

    // Calculate cart total with safe parsing
    let subtotal = 0;
    cart.items.forEach(item => {
      const price = safeParseFloat(item.productId.price);
      const quantity = safeParseInt(item.quantity);
      subtotal += price * quantity;
    });

    // Check minimum order amount
    if (subtotal < coupon.minimumOrderAmount) {
      return res.status(400).json({
        success: false,
        message: `Minimum order amount of $${coupon.minimumOrderAmount} required for this coupon`
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

    // Calculate totals with safe parsing
    const subtotal = cart.items.reduce((total, item) => {
      const price = safeParseFloat(item.productId.price);
      const quantity = safeParseInt(item.quantity);
      return total + (price * quantity);
    }, 0);

    const tax = subtotal * 0.13; 
    const shipping = subtotal > 75 ? 0 : 15; 
    
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

    // Prepare order items with image URLs
    const orderItems = cart.items.map(item => {
      const productWithImageUrl = addImageUrlToProduct(item.productId, req);
      return {
        productId: item.productId._id,
        name: productWithImageUrl.name,
        price: safeParseFloat(productWithImageUrl.price),
        quantity: safeParseInt(item.quantity),
        image: productWithImageUrl.image,
        imageUrl: productWithImageUrl.imageUrl,
        brand: productWithImageUrl.brand,
        category: productWithImageUrl.category
      };
    });

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

// Get user orders - UPDATED
const getUserOrders = async (req, res) => {
  try {
    const userId = req.user.id;
    const orders = await Order.find({ userId })
      .populate({
        path: 'items.productId',
        select: 'name price image description category brand'
      })
      .sort({ createdAt: -1 });

    // Add imageUrl to products in each order
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

// Get single order by ID - UPDATED
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

    // Add imageUrl to products in the order
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

// Track Order - UPDATED
const trackOrder = async (req, res) => {
  try {
    const { orderId, email } = req.body;

    if (!orderId || !email) {
      return res.status(400).json({
        success: false,
        message: 'Order ID and email are required'
      });
    }

    // Find order by orderNumber and email (no authentication required)
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

    // Add imageUrl to products in the order
    const orderObj = order.toObject();
    const itemsWithImageUrls = orderObj.items.map(item => ({
      ...item,
      imageUrl: item.imageUrl || (item.image ? `${req.protocol}://${req.get('host')}/images/Products/${item.image}` : null),
      price: safeParseFloat(item.price),
      quantity: safeParseInt(item.quantity)
    }));

    // Return order details
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
        billingAddress: order.billingAddress
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

module.exports = {
  getCheckoutData,
  applyCoupon,
  createOrder,
  getUserOrders,
  getOrderById,
  updateOrderStatus,
  getAvailableCoupons,
  trackOrder
};