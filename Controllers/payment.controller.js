const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Order = require('../Models/order.model');
const Cart = require('../Models/cart.model');
const Coupon = require('../Models/coupon.model');
const { sendOrderConfirmationWithPDF, sendInvoicePDF, notifyAdminNewOrder } = require('../Services/mailer');
const { generateOrderPDF, generateInvoicePDF } = require('../Services/pdfGenerator');

// Helper function to safely parse numbers
const safeParseFloat = (value) => {
  const parsed = parseFloat(value);
  return isNaN(parsed) ? 0 : parsed;
};

const safeParseInt = (value) => {
  const parsed = parseInt(value);
  return isNaN(parsed) ? 0 : parsed;
};

// Helper function to add imageUrl to product
const addImageUrlToProduct = (product, req) => {
  if (!product) return product;
  
  const productObj = product.toObject ? product.toObject() : product;
  return {
    ...productObj,
    imageUrl: productObj.image ? `${req.protocol}://${req.get('host')}/images/Products/${productObj.image}` : null,
    price: parseFloat(productObj.price) || 0
  };
};

// Calculate Canadian tax based on province
const calculateCanadianTax = (subtotal, province) => {
  const taxRates = {
    'ON': 0.13, // Ontario - HST
    'QC': 0.14975, // Quebec - GST + QST
    'BC': 0.12, // British Columbia - GST + PST
    'AB': 0.05, // Alberta - GST only
    'SK': 0.11, // Saskatchewan - GST + PST
    'MB': 0.12, // Manitoba - GST + PST
    'NB': 0.15, // New Brunswick - HST
    'NS': 0.15, // Nova Scotia - HST
    'PE': 0.15, // Prince Edward Island - HST
    'NL': 0.15, // Newfoundland and Labrador - HST
    'NT': 0.05, // Northwest Territories - GST only
    'NU': 0.05, // Nunavut - GST only
    'YT': 0.05  // Yukon - GST only
  };
  return subtotal * (taxRates[province?.toUpperCase()] || 0.13); // Default to Ontario rate
};

// Helper function to get supported payment methods based on selection
const getSupportedMethods = (paymentMethod) => {
  switch (paymentMethod) {
    case 'digital_wallet':
      return ['apple_pay', 'google_pay', 'link'];
    case 'klarna':
      return ['card', 'klarna'];
    case 'afterpay':
      return ['card', 'afterpay_clearpay'];
    default:
      return ['card'];
  }
};

// Create Payment Intent for Canadian payment methods
const createPaymentIntent = async (req, res) => {
  try {
    const userId = req.user.id;
    const { appliedCoupon, paymentMethod, province } = req.body;

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

    // Calculate totals
    const subtotal = cart.items.reduce((total, item) => {
      const price = safeParseFloat(item.productId.price);
      const quantity = safeParseInt(item.quantity);
      return total + (price * quantity);
    }, 0);

    // Calculate Canadian tax based on province
    const tax = calculateCanadianTax(subtotal, province);
    
    // Free shipping for orders over $75 CAD (common Canadian threshold)
    const shipping = subtotal > 75 ? 0 : 15; // $15 CAD shipping
    
    // Apply discount if coupon is provided
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
    const amountInCents = Math.round(total * 100); // Convert to cents for CAD

    // Create Payment Intent with Canadian configuration
    const paymentIntentData = {
      amount: amountInCents,
      currency: 'cad', // Canadian Dollar
      metadata: {
        userId: userId.toString(),
        subtotal: subtotal.toString(),
        tax: tax.toString(),
        shipping: shipping.toString(),
        discount: discount.toString(),
        total: total.toString(),
        paymentMethod: paymentMethod || 'card',
        province: province || 'ON',
        appliedCoupon: appliedCoupon ? JSON.stringify(appliedCoupon) : null
      }
    };

    // Configure payment methods for Canada - Use ONLY ONE approach
    switch (paymentMethod) {
      case 'card':
        paymentIntentData.payment_method_types = ['card'];
        break;
      case 'digital_wallet':
        // Enable Apple Pay, Google Pay, Link for Canada
        paymentIntentData.automatic_payment_methods = { 
          enabled: true,
          allow_redirects: 'never' // Keeps it to wallets only, no redirects
        };
        break;
      case 'klarna':
        // Buy now, pay later option (check if available in your Stripe account)
        paymentIntentData.payment_method_types = ['card', 'klarna'];
        break;
      case 'afterpay':
        // Another BNPL option (check availability in Canada)
        paymentIntentData.payment_method_types = ['card', 'afterpay_clearpay'];
        break;
      case 'paypal':
        // If you want to add PayPal support later
        paymentIntentData.payment_method_types = ['card', 'paypal'];
        break;
      default:
        // Default to card payments
        paymentIntentData.payment_method_types = ['card'];
    }

    const paymentIntent = await stripe.paymentIntents.create(paymentIntentData);

    res.status(200).json({
      success: true,
      data: {
        clientSecret: paymentIntent.client_secret,
        amount: total,
        currency: 'CAD',
        paymentMethod: paymentMethod || 'card',
        supportedMethods: getSupportedMethods(paymentMethod),
        taxBreakdown: {
          subtotal: subtotal.toFixed(2),
          tax: tax.toFixed(2),
          shipping: shipping.toFixed(2),
          discount: discount.toFixed(2),
          total: total.toFixed(2),
          province: province || 'ON'
        }
      }
    });

  } catch (error) {
    console.error('Error creating payment intent:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create payment intent',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Confirm Payment and Create Order
const confirmPaymentAndCreateOrder = async (req, res) => {
  try {
    const userId = req.user.id;
    const { paymentIntentId, contactInfo, billingAddress, paymentMethod } = req.body;

    // Retrieve payment intent from Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    
    if (paymentIntent.status !== 'succeeded') {
      return res.status(400).json({
        success: false,
        message: 'Payment not completed successfully'
      });
    }

    // Validate required fields for Canadian address
    if (!contactInfo?.email || !billingAddress?.firstName || !billingAddress?.lastName || 
        !billingAddress?.address || !billingAddress?.city || !billingAddress?.province || 
        !billingAddress?.postalCode) {
      return res.status(400).json({
        success: false,
        message: 'All required fields must be filled'
      });
    }

    // Validate Canadian postal code format (basic validation)
    const postalCodeRegex = /^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/;
    if (!postalCodeRegex.test(billingAddress.postalCode)) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid Canadian postal code (e.g., K1A 0A6)'
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

    // Extract data from payment intent metadata
    const metadata = paymentIntent.metadata;
    const subtotal = parseFloat(metadata.subtotal);
    const tax = parseFloat(metadata.tax);
    const shipping = parseFloat(metadata.shipping);
    const discount = parseFloat(metadata.discount);
    const total = parseFloat(metadata.total);
    const selectedPaymentMethod = metadata.paymentMethod || 'card';
    const province = metadata.province || 'ON';
    
    let couponData = null;
    if (metadata.appliedCoupon && metadata.appliedCoupon !== 'null') {
      const appliedCoupon = JSON.parse(metadata.appliedCoupon);
      
      // Update coupon usage count
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

    // Generate order number with Canadian prefix
    const timestamp = Date.now().toString();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    const orderNumber = `CAN${timestamp}${random}`;

    // Create order
    const order = new Order({
      userId,
      orderNumber,
      items: orderItems,
      contactInfo,
      billingAddress,
      paymentMethod: selectedPaymentMethod,
      paymentStatus: 'paid', // Mark as paid since Stripe payment succeeded
      status: 'confirmed', // Automatically confirm order for successful payments
      appliedCoupon: couponData,
      orderSummary: {
        subtotal,
        tax,
        shipping,
        discount,
        total,
        currency: 'CAD',
        province: province
      },
      stripePaymentId: paymentIntentId,
      stripePaymentIntentId: paymentIntent.id
    });

    await order.save();

    // Clear cart after successful order
    await Cart.findOneAndUpdate(
      { userId },
      { $set: { items: [] } }
    );

    // Generate PDFs
    const orderConfirmationPDF = await generateOrderPDF(order);
    const invoicePDF = await generateInvoicePDF(order, true); // true for paid invoice

    // Send order confirmation email with PDFs to customer
    await sendOrderConfirmationWithPDF(order, orderItems, {
      orderConfirmation: orderConfirmationPDF,
      invoice: invoicePDF
    });

    // Notify admin about new order
    await notifyAdminNewOrder(order, orderItems, {
      orderConfirmation: orderConfirmationPDF,
      invoice: invoicePDF
    });

    res.status(201).json({
      success: true,
      message: 'Order placed and payment confirmed successfully!',
      data: {
        orderNumber: order.orderNumber,
        orderId: order._id,
        total: `$${total.toFixed(2)} CAD`,
        paymentStatus: 'paid',
        paymentMethod: selectedPaymentMethod,
        province: province
      }
    });

  } catch (error) {
    console.error('Error confirming payment and creating order:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process order. Please contact support.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Process COD Payment (when delivered) - Updated for Canadian context
const processCODPayment = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { adminId } = req.body; // Admin confirmation

    // Find order
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

    if (order.paymentMethod !== 'cod') {
      return res.status(400).json({
        success: false,
        message: 'This is not a Cash on Delivery order'
      });
    }

    if (order.paymentStatus === 'paid') {
      return res.status(400).json({
        success: false,
        message: 'Order is already marked as paid'
      });
    }

    // Update order status
    order.paymentStatus = 'paid';
    order.status = 'delivered'; // Mark as delivered when COD is paid
    await order.save();

    // Generate paid invoice PDF
    const paidInvoicePDF = await generateInvoicePDF(order, true);

    // Send paid invoice to customer
    await sendInvoicePDF(order, paidInvoicePDF, 'paid');

    res.status(200).json({
      success: true,
      message: 'Cash on Delivery payment processed successfully',
      data: {
        orderNumber: order.orderNumber,
        paymentStatus: order.paymentStatus,
        status: order.status,
        total: `$${order.orderSummary.total.toFixed(2)} CAD`
      }
    });

  } catch (error) {
    console.error('Error processing COD payment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process COD payment'
    });
  }
};

// Get payment methods available in Canada
const getPaymentMethods = async (req, res) => {
  try {
    const paymentMethods = [
      {
        id: 'card',
        name: 'Credit/Debit Card',
        description: 'Visa, Mastercard, American Express - Secure payment',
        icon: '💳',
        enabled: true,
        popular: true
      },
      {
        id: 'digital_wallet',
        name: 'Digital Wallets',
        description: 'Apple Pay, Google Pay - Quick & secure checkout',
        icon: '📱',
        enabled: true,
        popular: true
      },
      {
        id: 'klarna',
        name: 'Klarna',
        description: 'Buy now, pay later in installments',
        icon: '🛍️',
        enabled: false, // Enable this if you have Klarna activated in your Stripe account
        note: 'Subject to approval'
      },
      {
        id: 'afterpay',
        name: 'Afterpay',
        description: 'Split your purchase into 4 interest-free payments',
        icon: '💰',
        enabled: false, // Enable this if you have Afterpay activated in your Stripe account
        note: 'Available for orders $35-$1000 CAD'
      },
      {
        id: 'cod',
        name: 'Cash on Delivery',
        description: 'Pay when you receive your order',
        icon: '💵',
        enabled: true,
        note: 'Available in select areas'
      }
    ];

    res.status(200).json({
      success: true,
      data: paymentMethods.filter(method => method.enabled), // Only return enabled methods
      currency: 'CAD',
      country: 'Canada'
    });
  } catch (error) {
    console.error('Error getting payment methods:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get payment methods'
    });
  }
};

// Get Canadian provinces for tax calculation
const getCanadianProvinces = async (req, res) => {
  try {
    const provinces = [
      { code: 'AB', name: 'Alberta', taxRate: 0.05 },
      { code: 'BC', name: 'British Columbia', taxRate: 0.12 },
      { code: 'MB', name: 'Manitoba', taxRate: 0.12 },
      { code: 'NB', name: 'New Brunswick', taxRate: 0.15 },
      { code: 'NL', name: 'Newfoundland and Labrador', taxRate: 0.15 },
      { code: 'NS', name: 'Nova Scotia', taxRate: 0.15 },
      { code: 'NT', name: 'Northwest Territories', taxRate: 0.05 },
      { code: 'NU', name: 'Nunavut', taxRate: 0.05 },
      { code: 'ON', name: 'Ontario', taxRate: 0.13 },
      { code: 'PE', name: 'Prince Edward Island', taxRate: 0.15 },
      { code: 'QC', name: 'Quebec', taxRate: 0.14975 },
      { code: 'SK', name: 'Saskatchewan', taxRate: 0.11 },
      { code: 'YT', name: 'Yukon', taxRate: 0.05 }
    ];

    res.status(200).json({
      success: true,
      data: provinces
    });
  } catch (error) {
    console.error('Error getting provinces:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get provinces'
    });
  }
};

// Webhook to handle Stripe events
const handleStripeWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.log(`Webhook signature verification failed.`, err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object;
      console.log('Payment succeeded:', paymentIntent.id);
      // Additional processing can be done here
      break;
    case 'payment_intent.payment_failed':
      const failedPayment = event.data.object;
      console.log('Payment failed:', failedPayment.id);
      // Handle failed payment - maybe send notification
      break;
    case 'payment_method.attached':
      const paymentMethod = event.data.object;
      console.log('Payment method attached:', paymentMethod.id);
      break;
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  res.json({ received: true });
};

module.exports = {
  createPaymentIntent,
  confirmPaymentAndCreateOrder,
  processCODPayment,
  getPaymentMethods,
  getCanadianProvinces,
  handleStripeWebhook
};