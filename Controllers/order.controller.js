const Order = require('../Models/order.model');
const Cart = require('../Models/cart.model'); 
const Coupon = require('../Models/coupon.model'); 
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const path = require('path');
const fs = require('fs');

// Import our services
const PDFGeneratorService = require('../Services/pdfGenerator.js');
const EmailService = require('../Services/mailer.js');

// Initialize email service
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

// Helper function to ensure uploads directory exists
const ensureUploadsDirectory = () => {
  const uploadsDir = path.join(__dirname, '../uploads/pdfs');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  return uploadsDir;
};

// Helper function to process order and send emails
const processOrderEmails = async (order, items, req, isPaymentCompleted = false) => {
  try {
    const uploadsDir = ensureUploadsDirectory();
    const tempFiles = [];

    // Generate and send order confirmation
    const orderConfirmationPath = path.join(uploadsDir, `order-confirmation-${order.orderNumber}.pdf`);
    await PDFGeneratorService.generateOrderConfirmationPDF(order, items, orderConfirmationPath);
    tempFiles.push(orderConfirmationPath);
    
    await emailService.sendOrderConfirmationEmail(order, items, orderConfirmationPath);

    if (order.paymentMethod === 'cod') {
      // For COD orders, send bill PDF
      const billPath = path.join(uploadsDir, `bill-${order.orderNumber}.pdf`);
      await PDFGeneratorService.generateBillPDF(order, items, billPath);
      tempFiles.push(billPath);
      
      await emailService.sendBillEmail(order, items, billPath);

      // Send admin notification with bill
      await emailService.sendAdminNotificationEmail(order, items, [
        {
          filename: `Order-Confirmation-${order.orderNumber}.pdf`,
          path: orderConfirmationPath,
          contentType: 'application/pdf'
        },
        {
          filename: `Bill-${order.orderNumber}.pdf`,
          path: billPath,
          contentType: 'application/pdf'
        }
      ]);

    } else if (isPaymentCompleted) {
      // For paid orders, generate and send invoice
      const invoicePath = path.join(uploadsDir, `invoice-${order.orderNumber}.pdf`);
      await PDFGeneratorService.generateInvoicePDF(order, items, invoicePath);
      tempFiles.push(invoicePath);
      
      await emailService.sendInvoiceEmail(order, items, invoicePath);

      // Send admin notification with invoice
      await emailService.sendAdminNotificationEmail(order, items, [
        {
          filename: `Order-Confirmation-${order.orderNumber}.pdf`,
          path: orderConfirmationPath,
          contentType: 'application/pdf'
        },
        {
          filename: `Invoice-${order.orderNumber}.pdf`,
          path: invoicePath,
          contentType: 'application/pdf'
        }
      ]);
    } else {
      // For pending payments, just send admin notification
      await emailService.sendAdminNotificationEmail(order, items, [
        {
          filename: `Order-Confirmation-${order.orderNumber}.pdf`,
          path: orderConfirmationPath,
          contentType: 'application/pdf'
        }
      ]);
    }

    // Clean up temp files after a delay (5 minutes)
    setTimeout(() => {
      emailService.cleanupTempFiles(tempFiles);
    }, 5 * 60 * 1000);

  } catch (error) {
    console.error('Error processing order emails:', error);
    // Don't throw error to prevent order creation failure
  }
};

// Helper function to send payment confirmation after COD delivery
const sendCODPaymentConfirmation = async (order, items) => {
  try {
    const uploadsDir = ensureUploadsDirectory();
    const tempFiles = [];

    // Generate invoice for completed COD payment
    const invoicePath = path.join(uploadsDir, `invoice-${order.orderNumber}.pdf`);
    await PDFGeneratorService.generateInvoicePDF(order, items, invoicePath);
    tempFiles.push(invoicePath);
    
    await emailService.sendPaymentConfirmationEmail(order, items, invoicePath);

    // Send invoice to admin
    await emailService.sendAdminNotificationEmail(order, items, [
      {
        filename: `Invoice-${order.orderNumber}.pdf`,
        path: invoicePath,
        contentType: 'application/pdf'
      }
    ]);

    // Clean up temp files after delay
    setTimeout(() => {
      emailService.cleanupTempFiles(tempFiles);
    }, 5 * 60 * 1000);

  } catch (error) {
    console.error('Error sending COD payment confirmation:', error);
  }
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

    const tax = subtotal * 0.18;
    const shipping = subtotal > 500 ? 0 : 50;
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
        message: `Minimum order amount of ₹${coupon.minimumOrderAmount} required for this coupon`
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

// Create Stripe Payment Intent
const createPaymentIntent = async (req, res) => {
  try {
    const userId = req.user.id;
    const { appliedCoupon } = req.body;

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

    const subtotal = cart.items.reduce((total, item) => {
      const price = safeParseFloat(item.productId.price);
      const quantity = safeParseInt(item.quantity);
      return total + (price * quantity);
    }, 0);

    const tax = subtotal * 0.18;
    const shipping = subtotal > 500 ? 0 : 50;
    
    let discount = 0;
    if (appliedCoupon) {
      const coupon = await Coupon.findOne({
        code: appliedCoupon.code.toUpperCase(),
        isActive: true
      });

      if (coupon && subtotal >= coupon.minimumOrderAmount) {
        if (coupon.discountType === 'percentage') {
          discount = (subtotal * coupon.discountValue) / 100;
          if (coupon.maximumDiscountAmount && discount > coupon.maximumDiscountAmount) {
            discount = coupon.maximumDiscountAmount;
          }
        } else if (coupon.discountType === 'fixed') {
          discount = coupon.discountValue;
        }
        discount = Math.min(discount, subtotal);
      }
    }

    const total = subtotal + tax + shipping - discount;
    const amountInPaise = Math.round(total * 100);

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInPaise,
      currency: 'inr',
      metadata: {
        userId: userId.toString(),
        subtotal: subtotal.toString(),
        tax: tax.toString(),
        shipping: shipping.toString(),
        discount: discount.toString(),
        total: total.toString(),
        appliedCoupon: appliedCoupon ? JSON.stringify(appliedCoupon) : null
      }
    });

    res.status(200).json({
      success: true,
      data: {
        clientSecret: paymentIntent.client_secret,
        amount: total,
        currency: 'INR'
      }
    });

  } catch (error) {
    console.error('Error creating payment intent:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create payment intent'
    });
  }
};

// Confirm Payment and Create Order
const confirmPaymentAndCreateOrder = async (req, res) => {
  try {
    const userId = req.user.id;
    const { paymentIntentId, contactInfo, billingAddress, paymentMethod } = req.body;

    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    
    if (paymentIntent.status !== 'succeeded') {
      return res.status(400).json({
        success: false,
        message: 'Payment not completed successfully'
      });
    }

    if (!contactInfo?.email || !billingAddress?.firstName || !billingAddress?.lastName || 
        !billingAddress?.address || !billingAddress?.city || !billingAddress?.province || 
        !billingAddress?.postalCode) {
      return res.status(400).json({
        success: false,
        message: 'All required fields must be filled'
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

    const metadata = paymentIntent.metadata;
    const subtotal = parseFloat(metadata.subtotal);
    const tax = parseFloat(metadata.tax);
    const shipping = parseFloat(metadata.shipping);
    const discount = parseFloat(metadata.discount);
    const total = parseFloat(metadata.total);
    
    let couponData = null;
    if (metadata.appliedCoupon && metadata.appliedCoupon !== 'null') {
      const appliedCoupon = JSON.parse(metadata.appliedCoupon);
      
      await Coupon.findOneAndUpdate(
        { code: appliedCoupon.code.toUpperCase() },
        { $inc: { usedCount: 1 } }
      );
      
      couponData = {
        code: appliedCoupon.code,
        description: appliedCoupon.description || '',
        discountType: appliedCoupon.discountType,
        discountValue: appliedCoupon.discountValue,
        discount: discount
      };
    }

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

    const timestamp = Date.now().toString();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    const orderNumber = `ORD${timestamp}${random}`;

    const order = new Order({
      userId,
      orderNumber,
      items: orderItems,
      contactInfo,
      billingAddress,
      paymentMethod: 'card',
      paymentStatus: 'paid',
      status: 'confirmed',
      appliedCoupon: couponData,
      orderSummary: {
        subtotal,
        tax,
        shipping,
        discount,
        total
      },
      stripePaymentId: paymentIntentId
    });

    await order.save();

    await Cart.findOneAndUpdate(
      { userId },
      { $set: { items: [] } }
    );

    // Process emails and PDF generation
    await processOrderEmails(order, orderItems, req, true);

    res.status(201).json({
      success: true,
      message: 'Order placed and payment confirmed successfully!',
      data: {
        orderNumber: order.orderNumber,
        orderId: order._id,
        total: total.toFixed(2),
        paymentStatus: 'paid'
      }
    });

  } catch (error) {
    console.error('Error confirming payment and creating order:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process order. Please contact support.'
    });
  }
};

// Create new order (for COD/UPI/NetBanking)
const createOrder = async (req, res) => {
  try {
    const userId = req.user.id;
    const { contactInfo, billingAddress, paymentMethod, appliedCoupon } = req.body;

    if (!contactInfo?.email || !billingAddress?.firstName || !billingAddress?.lastName || 
        !billingAddress?.address || !billingAddress?.city || !billingAddress?.province || 
        !billingAddress?.postalCode) {
      return res.status(400).json({
        success: false,
        message: 'All required fields must be filled'
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

    const subtotal = cart.items.reduce((total, item) => {
      const price = safeParseFloat(item.productId.price);
      const quantity = safeParseInt(item.quantity);
      return total + (price * quantity);
    }, 0);

    const tax = subtotal * 0.18;
    const shipping = subtotal > 500 ? 0 : 50;
    
    let discount = 0;
    let couponData = null;

    if (appliedCoupon) {
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

            await Coupon.findByIdAndUpdate(coupon._id, {
              $inc: { usedCount: 1 }
            });
          }
        }
      }
    }

    const total = subtotal + tax + shipping - discount;

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

    const timestamp = Date.now().toString();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    const orderNumber = `ORD${timestamp}${random}`;

    const order = new Order({
      userId,
      orderNumber,
      items: orderItems,
      contactInfo,
      billingAddress,
      paymentMethod: paymentMethod || 'cod',
      paymentStatus: (paymentMethod === 'upi' || paymentMethod === 'netbanking') ? 'paid' : 'pending',
      status: (paymentMethod === 'upi' || paymentMethod === 'netbanking') ? 'confirmed' : 'pending',
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

    await Cart.findOneAndUpdate(
      { userId },
      { $set: { items: [] } }
    );

    // Process emails and PDF generation based on payment method
    const isPaymentCompleted = paymentMethod === 'upi' || paymentMethod === 'netbanking';
    await processOrderEmails(order, orderItems, req, isPaymentCompleted);

    res.status(201).json({
      success: true,
      message: 'Order placed successfully!',
      data: {
        orderNumber: order.orderNumber,
        orderId: order._id,
        total: total.toFixed(2),
        paymentStatus: order.paymentStatus
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
    const { status, paymentStatus } = req.body;

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

    const oldPaymentStatus = order.paymentStatus;
    
    if (status) order.status = status;
    if (paymentStatus) order.paymentStatus = paymentStatus;

    await order.save();

    // If COD order payment status changed from pending to paid, send invoice
    if (order.paymentMethod === 'cod' && 
        oldPaymentStatus === 'pending' && 
        order.paymentStatus === 'paid') {
      
      const orderItems = order.items.map(item => ({
        productId: item.productId._id,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        image: item.image,
        imageUrl: item.imageUrl,
        brand: item.brand,
        category: item.category
      }));

      await sendCODPaymentConfirmation(order, orderItems);
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
  createPaymentIntent,
  confirmPaymentAndCreateOrder,
  createOrder,
  getUserOrders,
  getOrderById,
  updateOrderStatus,
  getAvailableCoupons,
  trackOrder
};