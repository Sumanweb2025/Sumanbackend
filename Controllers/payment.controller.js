const Order = require('../Models/order.model');
const Payment = require('../Models/payment.model');
const Cart = require('../Models/cart.model');
const Coupon = require('../Models/coupon.model');
const Product = require('../Models/product.model');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Refund = require('../Models/refund.model');

// Import our services
const PDFGeneratorService = require('../Services/pdfGenerator.js');
const EmailService = require('../Services/mailer.js');

// Initialize email service
const emailService = new EmailService();

// Helper function to add imageUrl to product and ensure price is a number
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

// Helper function to validate stock availability
const validateStockAvailability = async (cartItems) => {
  const stockErrors = [];
  
  for (const item of cartItems) {
    const product = await Product.findById(item.productId._id);
    
    if (!product) {
      stockErrors.push({
        productName: item.productId.name,
        message: 'Product not found'
      });
      continue;
    }
    
    if (product.piece < item.quantity) {
      stockErrors.push({
        productName: product.name,
        requestedQuantity: item.quantity,
        availableStock: product.piece,
        message: `Only ${product.piece} units available`
      });
    }
  }
  
  return stockErrors;
};

// Helper function to reduce inventory stock
const reduceInventoryStock = async (orderItems) => {
  const stockReductions = [];
  
  try {
    for (const item of orderItems) {
      const product = await Product.findById(item.productId);
      
      if (!product) {
        throw new Error(`Product ${item.name} not found in inventory`);
      }
      
      if (product.piece < item.quantity) {
        throw new Error(`Insufficient stock for ${product.name}. Available: ${product.piece}, Requested: ${item.quantity}`);
      }
      
      // Reduce stock
      const oldStock = product.piece;
      product.piece -= item.quantity;
      await product.save();
      
      stockReductions.push({
        productId: product._id,
        productName: product.name,
        oldStock,
        newStock: product.piece,
        reducedBy: item.quantity
      });
      
      //console.log(`Stock reduced for ${product.name}: ${oldStock} → ${product.piece} (Sold: ${item.quantity})`);
    }
    
    return { success: true, reductions: stockReductions };
    
  } catch (error) {
    // Rollback all stock changes if any error occurs
    console.error('Error reducing inventory, rolling back:', error);
    
    for (const reduction of stockReductions) {
      try {
        await Product.findByIdAndUpdate(
          reduction.productId,
          { $inc: { piece: reduction.reducedBy } }
        );
      } catch (rollbackError) {
        console.error('Error rolling back stock for', reduction.productName, rollbackError);
      }
    }
    
    throw error;
  }
};

// Helper function to generate PDF in memory
const generatePDFBuffer = async (type, order, items) => {
  try {
    let buffer;

    // Create appropriate PDF based on type
    // These methods return Promises that resolve to buffers, not streams
    if (type === 'orderConfirmation') {
      buffer = await PDFGeneratorService.generateOrderConfirmationPDFBuffer(order, items);
    } else if (type === 'invoice') {
      buffer = await PDFGeneratorService.generateInvoicePDFBuffer(order, items);
    } else if (type === 'bill') {
      buffer = await PDFGeneratorService.generateBillPDFBuffer(order, items);
    } else {
      throw new Error('Invalid PDF type');
    }

    // Since the PDFGeneratorService methods return buffers directly,
    // we don't need to handle streams - just return the buffer
    if (!Buffer.isBuffer(buffer)) {
      throw new Error(`PDF generation for type ${type} did not return a valid buffer`);
    }

    return buffer;
  } catch (error) {
    console.error(`Error generating PDF buffer for type ${type}:`, error);
    throw new Error(`PDF generation failed: ${error.message}`);
  }
};
// Helper function to process order and send emails
const processOrderEmails = async (order, items, payment, req, isPaymentCompleted = false) => {
  try {
    const emailAttachments = [];

    // Generate and store order confirmation PDF
    const orderConfirmationBuffer = await generatePDFBuffer('orderConfirmation', order, items);
    const orderConfirmationFilename = `Order-Confirmation-${order.orderNumber}.pdf`;

    await payment.storePDF('orderConfirmation', orderConfirmationFilename, orderConfirmationBuffer);
    emailAttachments.push({
      filename: orderConfirmationFilename,
      content: orderConfirmationBuffer,
      contentType: 'application/pdf'
    });

    // Send order confirmation email
    try {
      await emailService.sendOrderConfirmationEmailWithBuffer(order, items, orderConfirmationBuffer, orderConfirmationFilename);
      await payment.updateEmailStatus('orderConfirmationSent', true);
    } catch (emailError) {
      console.error('Error sending order confirmation email:', emailError);
      await payment.updateEmailStatus('orderConfirmationSent', false, emailError.message);
    }

    if (order.paymentMethod === 'cod') {
      // For COD orders, generate and store bill PDF
      const billBuffer = await generatePDFBuffer('bill', order, items);
      const billFilename = `Bill-${order.orderNumber}.pdf`;

      await payment.storePDF('bill', billFilename, billBuffer);
      emailAttachments.push({
        filename: billFilename,
        content: billBuffer,
        contentType: 'application/pdf'
      });

      // Send bill email
      try {
        await emailService.sendBillEmailWithBuffer(order, items, billBuffer, billFilename);
        await payment.updateEmailStatus('billSent', true);
      } catch (emailError) {
        console.error('Error sending bill email:', emailError);
        await payment.updateEmailStatus('billSent', false, emailError.message);
      }

    } else if (isPaymentCompleted) {
      // For paid orders, generate and store invoice PDF
      const invoiceBuffer = await generatePDFBuffer('invoice', order, items);
      const invoiceFilename = `Invoice-${order.orderNumber}.pdf`;

      await payment.storePDF('invoice', invoiceFilename, invoiceBuffer);
      emailAttachments.push({
        filename: invoiceFilename,
        content: invoiceBuffer,
        contentType: 'application/pdf'
      });

      // Send invoice email
      try {
        await emailService.sendInvoiceEmailWithBuffer(order, items, invoiceBuffer, invoiceFilename);
        await payment.updateEmailStatus('invoiceSent', true);
      } catch (emailError) {
        console.error('Error sending invoice email:', emailError);
        await payment.updateEmailStatus('invoiceSent', false, emailError.message);
      }
    }

    // Send admin notification
    try {
      await emailService.sendAdminNotificationEmailWithBuffer(order, items, emailAttachments);
      await payment.updateEmailStatus('adminNotificationSent', true);
    } catch (emailError) {
      console.error('Error sending admin notification:', emailError);
      await payment.updateEmailStatus('adminNotificationSent', false, emailError.message);
    }

    // Log successful payment processing
    await payment.addPaymentLog(
      'EMAIL_PROCESSING',
      'SUCCESS',
      'Order emails and PDFs processed successfully',
      {
        orderNumber: order.orderNumber,
        emailsSent: emailAttachments.length,
        paymentCompleted: isPaymentCompleted
      }
    );

  } catch (error) {
    console.error('Error processing order emails:', error);

    // Log error
    await payment.addPaymentLog(
      'EMAIL_PROCESSING',
      'ERROR',
      error.message,
      { orderNumber: order.orderNumber }
    );
  }
};

// Create Stripe Payment Intent
const createPaymentIntent = async (req, res) => {
  try {
    const userId = req.user.isGuest ? null : req.user.id;
    const sessionId = req.user.isGuest ? req.user.sessionId : null;
    const { appliedCoupon } = req.body;


    // Find cart based on user type
    let cart;
    if (userId) {
      cart = await Cart.findOne({ userId }).populate({
        path: 'items.productId',
        select: 'name price image description category brand'
      });
    } else if (sessionId) {
      cart = await Cart.findOne({ sessionId }).populate({
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

    const subtotal = cart.items.reduce((total, item) => {
      const price = safeParseFloat(item.productId.price);
      const quantity = safeParseInt(item.quantity);
      return total + (price * quantity);
    }, 0);

    const tax = subtotal * 0.13;
    const shipping = subtotal >= 75 ? 0 : 9.99;

    let discount = 0;
    let firstOrderDiscount = 0;

    // Check if logged-in user's first order
    if (userId) {
      const previousOrders = await Order.countDocuments({ 
        userId, 
        paymentStatus: { $in: ['paid', 'pending'] } 
      });
      
      if (previousOrders === 0) {
        firstOrderDiscount = subtotal * 0.02; // 2% discount
        discount += firstOrderDiscount;
      }
    }
    if (appliedCoupon) {
      const coupon = await Coupon.findOne({
        code: appliedCoupon.code.toUpperCase(),
        isActive: true
      });

      if (coupon && subtotal >= coupon.minimumOrderAmount) {
        if (coupon.discountType === 'percentage') {
          let couponDiscount = (subtotal * coupon.discountValue) / 100;
          if (coupon.maximumDiscountAmount && couponDiscount > coupon.maximumDiscountAmount) {
            couponDiscount = coupon.maximumDiscountAmount;
          }
          discount += couponDiscount;
        } else if (coupon.discountType === 'fixed') {
          discount += coupon.discountValue;
        }
      }
    }

    discount = Math.min(discount, subtotal);

    const total = subtotal + tax + shipping - discount;
    const amountInCents = Math.round(total * 100);

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: 'cad',
      metadata: {
        userId: userId ? userId.toString() : 'guest',
        sessionId: sessionId || null,
        isGuest: req.user.isGuest.toString(),
        subtotal: subtotal.toString(),
        tax: tax.toString(),
        shipping: shipping.toString(),
        discount: discount.toString(),
        firstOrderDiscount: firstOrderDiscount.toString(),
        total: total.toString(),
        appliedCoupon: appliedCoupon ? JSON.stringify(appliedCoupon) : null
      }
    });

    res.status(200).json({
      success: true,
      data: {
        clientSecret: paymentIntent.client_secret,
        amount: total,
        currency: 'CAD',
        firstOrderDiscount: firstOrderDiscount > 0 ? firstOrderDiscount.toFixed(2) : null
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

// Helper function to generate unique payment ID
const generateUniquePaymentId = (paymentMethod, orderNumber) => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substr(2, 9);
  return `${paymentMethod.toUpperCase()}_${orderNumber}_${timestamp}_${random}`;
};

// Confirm Payment and Create Order
const confirmPaymentAndCreateOrder = async (req, res) => {
  try {
    const userId = req.user.isGuest ? null : req.user.id;
    const sessionId = req.user.isGuest ? req.user.sessionId : null;
    const { paymentIntentId, contactInfo, billingAddress, paymentMethod, isGuestOrder } = req.body;

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

    // Find cart based on user type
    let cart;
    if (userId) {
      cart = await Cart.findOne({ userId }).populate({
        path: 'items.productId',
        select: 'name price image description category brand'
      });
    } else if (sessionId) {
      cart = await Cart.findOne({ sessionId }).populate({
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

    // Validate stock availability before processing
    const stockErrors = await validateStockAvailability(cart.items);
    if (stockErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Some items are out of stock or have insufficient quantity',
        stockErrors: stockErrors
      });
    }

    const metadata = paymentIntent.metadata;
    const subtotal = parseFloat(metadata.subtotal);
    const tax = parseFloat(metadata.tax);
    const shipping = parseFloat(metadata.shipping);
    const discount = parseFloat(metadata.discount);
    const firstOrderDiscount = parseFloat(metadata.firstOrderDiscount || 0);
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
      // Extract single image string if it's an array
      const imageValue = Array.isArray(productWithImageUrl.image)
        ? productWithImageUrl.image[0]
        : productWithImageUrl.image;

      return {
        productId: item.productId._id,
        name: productWithImageUrl.name,
        price: safeParseFloat(productWithImageUrl.price),
        quantity: safeParseInt(item.quantity),
        image: imageValue,
        imageUrl: productWithImageUrl.imageUrl,
        brand: productWithImageUrl.brand,
        category: productWithImageUrl.category
      };
    });

    const timestamp = Date.now().toString();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    const orderNumber = `ORD${timestamp}${random}`;

    // Create Order
    const order = new Order({
      userId: userId || null,
      sessionId: sessionId || null,
      isGuestOrder: isGuestOrder || false,
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
        firstOrderDiscount,
        total
      },
      stripePaymentId: paymentIntentId
    });

    await order.save();


    // Reduce inventory stock for ordered items
    try {
      const stockReduction = await reduceInventoryStock(orderItems);
      //console.log(`Inventory reduced successfully for order ${orderNumber}:`, stockReduction.reductions.length, 'products updated');
    } catch (stockError) {
      console.error('Error reducing inventory:', stockError);
      // Order is already created, log the error but don't fail the request
      // Admin should manually adjust inventory
      await order.updateOne({ 
        notes: `WARNING: Inventory reduction failed. Please manually adjust stock. Error: ${stockError.message}` 
      });
    }

    // Create Payment Record
    const payment = new Payment({
      orderId: order._id,
      userId: userId || null,
      sessionId: sessionId || null,
      isGuestOrder: isGuestOrder || false,
      orderNumber: order.orderNumber,
      paymentId: generateUniquePaymentId('card', order.orderNumber),
      paymentMethod: 'card',
      paymentStatus: 'paid',
      amount: total,
      currency: 'CAD',
      stripePaymentId: paymentIntentId,
      stripePaymentIntentId: paymentIntentId,
      transactionDetails: {
        subtotal,
        tax,
        shipping,
        discount,
        firstOrderDiscount,
        total
      },
      customerInfo: {
        email: contactInfo.email,
        firstName: billingAddress.firstName,
        lastName: billingAddress.lastName,
        phone: billingAddress.phone,
        address: {
          street: billingAddress.address,
          apartment: billingAddress.apartment,
          city: billingAddress.city,
          province: billingAddress.province,
          postalCode: billingAddress.postalCode,
          country: billingAddress.country
        }
      },
      appliedCoupon: couponData
    });

    await payment.save();

    await payment.addPaymentLog(
      'PAYMENT_CREATED',
      'SUCCESS',
      'Payment record created successfully',
      {
        stripePaymentId: paymentIntentId,
        amount: total,
        currency: 'CAD',
        isGuest: isGuestOrder,
        firstOrderDiscount
      }
    );

    // Clear cart based on user type
    if (userId) {
      await Cart.findOneAndUpdate(
        { userId },
        { $set: { items: [] } }
      );
    } else if (sessionId) {
      await Cart.findOneAndUpdate(
        { sessionId },
        { $set: { items: [] } }
      );
    }

    await processOrderEmails(order, orderItems, payment, req, true);

    res.status(201).json({
      success: true,
      message: 'Order placed and payment confirmed successfully!',
      data: {
        orderNumber: order.orderNumber,
        orderId: order._id,
        paymentId: payment._id,
        total: total.toFixed(2),
        paymentStatus: 'paid',
        currency: 'CAD',
        firstOrderDiscount: firstOrderDiscount > 0 ? firstOrderDiscount.toFixed(2) : null
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

// Create COD Order
const createCODOrder = async (req, res) => {
  try {
    const userId = req.user.isGuest ? null : req.user.id;
    const sessionId = req.user.isGuest ? req.user.sessionId : null;
    const { contactInfo, billingAddress, appliedCoupon, isGuestOrder } = req.body;

    if (!contactInfo?.email || !billingAddress?.firstName || !billingAddress?.lastName ||
      !billingAddress?.address || !billingAddress?.city || !billingAddress?.province ||
      !billingAddress?.postalCode) {
      return res.status(400).json({
        success: false,
        message: 'All required fields must be filled'
      });
    }

    // Find cart based on user type
    let cart;
    if (userId) {
      cart = await Cart.findOne({ userId }).populate({
        path: 'items.productId',
        select: 'name price image description category brand'
      });
    } else if (sessionId) {
      cart = await Cart.findOne({ sessionId }).populate({
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

     // Validate stock availability before processing COD order
    const stockErrors = await validateStockAvailability(cart.items);
    if (stockErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Some items are out of stock or have insufficient quantity',
        stockErrors: stockErrors
      });
    }

    const subtotal = cart.items.reduce((total, item) => {
      const price = safeParseFloat(item.productId.price);
      const quantity = safeParseInt(item.quantity);
      return total + (price * quantity);
    }, 0);

    const tax = subtotal * 0.13;
    const shipping = subtotal >= 75 ? 0 : 9.99;

    let discount = 0;
    let firstOrderDiscount = 0;
    let couponData = null;

    // Check if logged-in user's first order
    if (userId) {
      const previousOrders = await Order.countDocuments({ 
        userId, 
        paymentStatus: { $in: ['paid', 'pending'] } 
      });
      
      if (previousOrders === 0) {
        firstOrderDiscount = subtotal * 0.02; // 2% discount
        discount += firstOrderDiscount;
      }
    }

    if (appliedCoupon) {
      const coupon = await Coupon.findOne({
        code: appliedCoupon.code.toUpperCase(),
        isActive: true
      });

      if (coupon) {
        const currentDate = new Date();
        if (currentDate >= coupon.validFrom && currentDate <= coupon.validUntil) {
          if (subtotal >= coupon.minimumOrderAmount) {
            let couponDiscount = 0;
            if (coupon.discountType === 'percentage') {
              couponDiscount = (subtotal * coupon.discountValue) / 100;
              if (coupon.maximumDiscountAmount && couponDiscount > coupon.maximumDiscountAmount) {
                couponDiscount = coupon.maximumDiscountAmount;
              }
            } else if (coupon.discountType === 'fixed') {
              couponDiscount = coupon.discountValue;
            }
            
            discount += couponDiscount;

            couponData = {
              code: coupon.code,
              description: coupon.description,
              discountType: coupon.discountType,
              discountValue: coupon.discountValue,
              discount: couponDiscount
            };

            await Coupon.findByIdAndUpdate(coupon._id, {
              $inc: { usedCount: 1 }
            });
          }
        }
      }
    }

    discount = Math.min(discount, subtotal);

    const total = subtotal + tax + shipping - discount;

    const orderItems = cart.items.map(item => {
      const productWithImageUrl = addImageUrlToProduct(item.productId, req);
      // Extract single image string if it's an array
      const imageValue = Array.isArray(productWithImageUrl.image)
        ? productWithImageUrl.image[0]
        : productWithImageUrl.image;

      return {
        productId: item.productId._id,
        name: productWithImageUrl.name,
        price: safeParseFloat(productWithImageUrl.price),
        quantity: safeParseInt(item.quantity),
        image: imageValue,
        imageUrl: productWithImageUrl.imageUrl,
        brand: productWithImageUrl.brand,
        category: productWithImageUrl.category
      };
    });

    const timestamp = Date.now().toString();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    const orderNumber = `ORD${timestamp}${random}`;

    // Create Order
    const order = new Order({
      userId: userId || null,
      sessionId: sessionId || null,
      isGuestOrder: isGuestOrder || false,
      orderNumber,
      items: orderItems,
      contactInfo,
      billingAddress,
      paymentMethod: 'cod',
      paymentStatus: 'pending',
      status: 'pending',
      appliedCoupon: couponData,
      orderSummary: {
        subtotal,
        tax,
        shipping,
        discount,
        firstOrderDiscount,
        total
      }
    });

    await order.save();

    // Reduce inventory stock for COD ordered items
    try {
      const stockReduction = await reduceInventoryStock(orderItems);
      //console.log(`Inventory reduced successfully for COD order ${orderNumber}:`, stockReduction.reductions.length, 'products updated');
    } catch (stockError) {
      console.error('Error reducing inventory for COD order:', stockError);
      // Order is already created, log the error but don't fail the request
      // Admin should manually adjust inventory
      await order.updateOne({ 
        notes: `WARNING: Inventory reduction failed. Please manually adjust stock. Error: ${stockError.message}` 
      });
    }

    // Create Payment Record
    const payment = new Payment({
      orderId: order._id,
      userId: userId || null,
      sessionId: sessionId || null,
      isGuestOrder: isGuestOrder || false,
      orderNumber: order.orderNumber,
      paymentId: generateUniquePaymentId('cod', order.orderNumber),
      paymentMethod: 'cod',
      paymentStatus: 'pending',
      amount: total,
      currency: 'CAD',
      transactionDetails: {
        subtotal,
        tax,
        shipping,
        discount,
        firstOrderDiscount,
        total
      },
      customerInfo: {
        email: contactInfo.email,
        firstName: billingAddress.firstName,
        lastName: billingAddress.lastName,
        phone: billingAddress.phone,
        address: {
          street: billingAddress.address,
          apartment: billingAddress.apartment,
          city: billingAddress.city,
          province: billingAddress.province,
          postalCode: billingAddress.postalCode,
          country: billingAddress.country
        }
      },
      appliedCoupon: couponData
    });

    await payment.save();

    await payment.addPaymentLog(
      'COD_ORDER_CREATED',
      'SUCCESS',
      'COD order created successfully',
      {
        amount: total,
        currency: 'CAD',
        isGuest: isGuestOrder,
        firstOrderDiscount
      }
    );

    // Clear cart based on user type
    if (userId) {
      await Cart.findOneAndUpdate(
        { userId },
        { $set: { items: [] } }
      );
    } else if (sessionId) {
      await Cart.findOneAndUpdate(
        { sessionId },
        { $set: { items: [] } }
      );
    }

    await processOrderEmails(order, orderItems, payment, req, false);

    res.status(201).json({
      success: true,
      message: 'COD Order placed successfully!',
      data: {
        orderNumber: order.orderNumber,
        orderId: order._id,
        paymentId: payment._id,
        total: total.toFixed(2),
        paymentStatus: 'pending',
        currency: 'CAD',
        firstOrderDiscount: firstOrderDiscount > 0 ? firstOrderDiscount.toFixed(2) : null
      }
    });

  } catch (error) {
    console.error('Error creating COD order:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to place order. Please try again.'
    });
  }
};

// Update Payment Status (for COD completion)
const updatePaymentStatus = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { paymentStatus, notes } = req.body;

    const payment = await Payment.findById(paymentId).populate('orderId');

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment record not found'
      });
    }

    const oldStatus = payment.paymentStatus;
    payment.paymentStatus = paymentStatus;

    // Update corresponding order
    const order = await Order.findById(payment.orderId).populate({
      path: 'items.productId',
      select: 'name price image description category brand'
    });

    if (order) {
      order.paymentStatus = paymentStatus;
      if (paymentStatus === 'paid') {
        order.status = 'confirmed';
      }
      await order.save();
    }

    await payment.save();

    // Log status update
    await payment.addPaymentLog(
      'PAYMENT_STATUS_UPDATE',
      'SUCCESS',
      `Payment status updated from ${oldStatus} to ${paymentStatus}`,
      {
        oldStatus,
        newStatus: paymentStatus,
        notes: notes || null
      }
    );

    // If COD payment completed, send invoice
    if (payment.paymentMethod === 'cod' &&
      oldStatus === 'pending' &&
      paymentStatus === 'paid') {

      // Generate and store invoice
      const invoiceBuffer = await generatePDFBuffer('invoice', order, order.items);
      const invoiceFilename = `Invoice-${order.orderNumber}.pdf`;

      await payment.storePDF('invoice', invoiceFilename, invoiceBuffer);

      // Send payment confirmation email with invoice
      try {
        await emailService.sendPaymentConfirmationEmailWithBuffer(
          order,
          order.items,
          invoiceBuffer,
          invoiceFilename
        );
        await payment.updateEmailStatus('invoiceSent', true);
      } catch (emailError) {
        console.error('Error sending payment confirmation:', emailError);
        await payment.updateEmailStatus('invoiceSent', false, emailError.message);
      }
    }

    res.status(200).json({
      success: true,
      message: 'Payment status updated successfully',
      data: {
        payment: payment,
        order: order
      }
    });
  } catch (error) {
    console.error('Error updating payment status:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// Get Payment Details
const getPaymentDetails = async (req, res) => {
  try {
    const { paymentId } = req.params;

    const payment = await Payment.findById(paymentId)
      .populate('orderId')
      .populate('userId', 'firstName lastName email');

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    res.status(200).json({
      success: true,
      data: payment
    });
  } catch (error) {
    console.error('Error getting payment details:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// Download PDF from Database
const downloadPDF = async (req, res) => {
  try {
    const { paymentId, pdfType } = req.params;

    const payment = await Payment.findById(paymentId);

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment record not found'
      });
    }

    const pdf = payment.getPDF(pdfType);

    if (!pdf) {
      return res.status(404).json({
        success: false,
        message: 'PDF not found'
      });
    }

    res.setHeader('Content-Type', pdf.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${pdf.filename}"`);
    res.send(pdf.data);

  } catch (error) {
    console.error('Error downloading PDF:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// Get All Payments (Admin)
const getAllPayments = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, method, search } = req.query;

    const query = {};

    if (status) query.paymentStatus = status;
    if (method) query.paymentMethod = method;
    if (search) {
      query.$or = [
        { orderNumber: { $regex: search, $options: 'i' } },
        { 'customerInfo.email': { $regex: search, $options: 'i' } },
        { 'customerInfo.firstName': { $regex: search, $options: 'i' } },
        { 'customerInfo.lastName': { $regex: search, $options: 'i' } }
      ];
    }

    const payments = await Payment.find(query)
      .populate('orderId', 'orderNumber status')
      .populate('userId', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Payment.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        payments,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        total
      }
    });
  } catch (error) {
    console.error('Error getting payments:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// Get User Payments
const getUserPayments = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10 } = req.query;

    const payments = await Payment.find({ userId })
      .populate('orderId', 'orderNumber status items')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Payment.countDocuments({ userId });

    res.status(200).json({
      success: true,
      data: {
        payments,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        total
      }
    });
  } catch (error) {
    console.error('Error getting user payments:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// Refund Payment
const refundPayment = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { reason, refundAmount } = req.body;

    const payment = await Payment.findById(paymentId).populate('orderId');

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    if (payment.paymentMethod !== 'card') {
      return res.status(400).json({
        success: false,
        message: 'Only card payments can be refunded through Stripe'
      });
    }

    if (!payment.stripePaymentId) {
      return res.status(400).json({
        success: false,
        message: 'No Stripe payment ID found'
      });
    }

    // Process refund with Stripe
    const refundAmountInCents = Math.round((refundAmount || payment.amount) * 100);

    const refund = await stripe.refunds.create({
      payment_intent: payment.stripePaymentId,
      amount: refundAmountInCents,
      reason: 'requested_by_customer',
      metadata: {
        orderId: payment.orderId._id.toString(),
        reason: reason || 'Customer request'
      }
    });

    // Update payment status
    payment.paymentStatus = 'refunded';
    await payment.save();

    // Update order status
    if (payment.orderId) {
      const order = await Order.findById(payment.orderId);
      if (order) {
        order.paymentStatus = 'refunded';
        order.status = 'cancelled';
        await order.save();
      }
    }

    // Log refund
    await payment.addPaymentLog(
      'REFUND_PROCESSED',
      'SUCCESS',
      `Refund processed: ${(refundAmountInCents / 100).toFixed(2)} CAD`,
      {
        stripeRefundId: refund.id,
        refundAmount: refundAmountInCents / 100,
        reason: reason || 'Customer request'
      }
    );

    res.status(200).json({
      success: true,
      message: 'Refund processed successfully',
      data: {
        refundId: refund.id,
        amount: refundAmountInCents / 100,
        currency: 'CAD',
        status: refund.status
      }
    });

  } catch (error) {
    console.error('Error processing refund:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process refund'
    });
  }
};

// Get Payment Statistics (Admin)
const getPaymentStatistics = async (req, res) => {
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

    // Total revenue
    const totalRevenue = await Payment.aggregate([
      {
        $match: {
          paymentStatus: 'paid',
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' }
        }
      }
    ]);

    // Payment method breakdown
    const paymentMethodStats = await Payment.aggregate([
      {
        $match: {
          paymentStatus: 'paid',
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$paymentMethod',
          count: { $sum: 1 },
          total: { $sum: '$amount' }
        }
      }
    ]);

    // Payment status breakdown
    const paymentStatusStats = await Payment.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$paymentStatus',
          count: { $sum: 1 },
          total: { $sum: '$amount' }
        }
      }
    ]);

    // Daily revenue (for charts)
    const dailyRevenue = await Payment.aggregate([
      {
        $match: {
          paymentStatus: 'paid',
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          },
          revenue: { $sum: '$amount' },
          orders: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 }
      }
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalRevenue: totalRevenue[0]?.total || 0,
        paymentMethodStats,
        paymentStatusStats,
        dailyRevenue,
        period,
        currency: 'CAD'
      }
    });

  } catch (error) {
    console.error('Error getting payment statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// ADD THIS NEW WEBHOOK HANDLER FUNCTION
const handleStripeWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.log('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case 'refund.created':
        await handleRefundCreated(event.data.object);
        break;

      case 'refund.updated':
        await handleRefundUpdated(event.data.object);
        break;

      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Webhook handling error:', error);
    res.status(500).json({ error: 'Webhook handling failed' });
  }
};

// ADD THIS NEW HELPER FUNCTION
const handleRefundCreated = async (refundObject) => {
  try {
    const refund = await Refund.findOne({ stripeRefundId: refundObject.id });

    if (refund) {
      refund.refundStatus = 'processing';
      refund.stripeRefundObject = refundObject;
      await refund.save();

      // Update order refund status
      await Order.findByIdAndUpdate(
        refund.orderId,
        { refundStatus: 'processing' }
      );

      // Log refund processing
      await refund.addRefundLog(
        'REFUND_PROCESSING',
        'SUCCESS',
        'Refund is being processed by Stripe',
        { stripeRefundId: refundObject.id }
      );
    }
  } catch (error) {
    console.error('Error handling refund created:', error);
  }
};

// ADD THIS NEW HELPER FUNCTION
const handleRefundUpdated = async (refundObject) => {
  try {
    const refund = await Refund.findOne({ stripeRefundId: refundObject.id })
      .populate('orderId')
      .populate('userId', 'firstName lastName email');

    if (refund) {
      const newStatus = refundObject.status === 'succeeded' ? 'completed' : 'failed';

      refund.refundStatus = newStatus;
      refund.stripeRefundObject = refundObject;

      if (newStatus === 'completed') {
        refund.processedAt = new Date();
      }

      await refund.save();

      // Update order refund status
      await Order.findByIdAndUpdate(
        refund.orderId._id,
        { refundStatus: newStatus }
      );

      // Log refund completion/failure
      await refund.addRefundLog(
        newStatus === 'completed' ? 'REFUND_COMPLETED' : 'REFUND_FAILED',
        newStatus.toUpperCase(),
        `Refund ${newStatus} by Stripe`,
        {
          stripeRefundId: refundObject.id,
          amount: refundObject.amount / 100
        }
      );

      // Send completion email if successful
      if (newStatus === 'completed') {
        try {
          await emailService.sendRefundCompletionEmail(refund.orderId, refund, refund.userId);
          await refund.updateEmailStatus('refundCompletedSent', true);
        } catch (emailError) {
          console.error('Error sending refund completion email:', emailError);
        }
      }
    }
  } catch (error) {
    console.error('Error handling refund updated:', error);
  }
};

// ADD THIS NEW ADMIN FUNCTION
const getRefundDetails = async (req, res) => {
  try {
    const { refundId } = req.params;

    const refund = await Refund.findById(refundId)
      .populate('orderId')
      .populate('paymentId')
      .populate('userId', 'firstName lastName email')
      .populate('processedBy', 'firstName lastName email');

    if (!refund) {
      return res.status(404).json({
        success: false,
        message: 'Refund not found'
      });
    }

    res.status(200).json({
      success: true,
      data: refund
    });
  } catch (error) {
    console.error('Error getting refund details:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// ADD THIS NEW ADMIN FUNCTION
const getAllRefunds = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, paymentMethod, search } = req.query;

    const query = {};

    if (status) query.refundStatus = status;
    if (paymentMethod) query.paymentMethod = paymentMethod;
    if (search) {
      query.$or = [
        { orderNumber: { $regex: search, $options: 'i' } },
        { 'customerInfo.email': { $regex: search, $options: 'i' } },
        { 'customerInfo.firstName': { $regex: search, $options: 'i' } },
        { 'customerInfo.lastName': { $regex: search, $options: 'i' } }
      ];
    }

    const refunds = await Refund.find(query)
      .populate('orderId', 'orderNumber status')
      .populate('paymentId', 'paymentId')
      .populate('userId', 'firstName lastName email')
      .populate('processedBy', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Refund.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        refunds,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        total
      }
    });
  } catch (error) {
    console.error('Error getting refunds:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

module.exports = {
  createPaymentIntent,
  confirmPaymentAndCreateOrder,
  createCODOrder,
  updatePaymentStatus,
  getPaymentDetails,
  downloadPDF,
  getAllPayments,
  getUserPayments,
  refundPayment,
  getPaymentStatistics,
  handleStripeWebhook,
  handleRefundCreated,
  handleRefundUpdated,
  getRefundDetails,
  getAllRefunds
};