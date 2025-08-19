
const EmailService = require('./mailer.service');

class AdminNotificationService {
  constructor() {
    this.emailService = new EmailService();
    this.adminEmails = [
      process.env.ADMIN_EMAIL || process.env.EMAIL_USER,
      // Add multiple admin emails if needed
      // 'admin2@yourcompany.com',
      // 'manager@yourcompany.com'
    ].filter(Boolean); // Filter out undefined values
  }

  // Send real-time notification for new orders
  async notifyNewOrder(order, items) {
    try {
      console.log(`📧 Sending admin notification for order ${order.orderNumber}`);
      
      // Since we don't have admin dashboard yet, we'll use console logs
      // and email notifications for now
      
      this.logOrderToConsole(order, items);
      
      // Send email notification to admin
      await this.emailService.sendAdminNotificationEmail(order, items);
      
      // Future: Push notification to admin dashboard
      // await this.sendPushNotification(order);
      
      console.log('✅ Admin notification sent successfully');
    } catch (error) {
      console.error('❌ Error sending admin notification:', error);
    }
  }

  // Log order details to console (temporary solution until admin dashboard is ready)
  logOrderToConsole(order, items) {
    console.log('\n🔔 NEW ORDER RECEIVED 🔔');
    console.log('========================');
    console.log(`Order Number: ${order.orderNumber}`);
    console.log(`Customer: ${order.billingAddress.firstName} ${order.billingAddress.lastName}`);
    console.log(`Email: ${order.contactInfo.email}`);
    console.log(`Payment Method: ${order.paymentMethod.toUpperCase()}`);
    console.log(`Payment Status: ${order.paymentStatus.toUpperCase()}`);
    console.log(`Total Amount: ₹${order.orderSummary.total.toFixed(2)}`);
    console.log(`Order Status: ${order.status.toUpperCase()}`);
    
    console.log('\n📦 ITEMS ORDERED:');
    items.forEach((item, index) => {
      console.log(`${index + 1}. ${item.name}`);
      console.log(`   Quantity: ${item.quantity}`);
      console.log(`   Price: ₹${item.price.toFixed(2)}`);
      console.log(`   Total: ₹${(item.price * item.quantity).toFixed(2)}`);
      console.log('');
    });
    
    console.log('📍 DELIVERY ADDRESS:');
    console.log(`${order.billingAddress.address}`);
    if (order.billingAddress.apartment) {
      console.log(`${order.billingAddress.apartment}`);
    }
    console.log(`${order.billingAddress.city}, ${order.billingAddress.province} ${order.billingAddress.postalCode}`);
    console.log(`${order.billingAddress.country}`);
    if (order.billingAddress.phone) {
      console.log(`Phone: ${order.billingAddress.phone}`);
    }
    
    if (order.paymentMethod === 'cod') {
      console.log('\n💰 CASH ON DELIVERY - ACTION REQUIRED');
      console.log('⚠️  Coordinate with delivery team for payment collection');
    } else {
      console.log(`\n💳 ONLINE PAYMENT - ${order.paymentStatus.toUpperCase()}`);
      if (order.stripePaymentId) {
        console.log(`Payment ID: ${order.stripePaymentId}`);
      }
    }
    
    console.log('\n⚡ NEXT ACTIONS:');
    console.log('1. Update order status in system');
    console.log('2. Prepare items for packaging');
    console.log('3. Generate shipping label');
    console.log('4. Send tracking information to customer');
    
    console.log('========================\n');
  }

  // Prepare order data for admin dashboard (future implementation)
  prepareAdminDashboardData(order, items) {
    return {
      id: order._id,
      orderNumber: order.orderNumber,
      customer: {
        name: `${order.billingAddress.firstName} ${order.billingAddress.lastName}`,
        email: order.contactInfo.email,
        phone: order.billingAddress.phone || 'Not provided',
        address: {
          full: `${order.billingAddress.address}${order.billingAddress.apartment ? ', ' + order.billingAddress.apartment : ''}, ${order.billingAddress.city}, ${order.billingAddress.province} ${order.billingAddress.postalCode}, ${order.billingAddress.country}`,
          line1: order.billingAddress.address,
          line2: order.billingAddress.apartment,
          city: order.billingAddress.city,
          state: order.billingAddress.province,
          postalCode: order.billingAddress.postalCode,
          country: order.billingAddress.country
        }
      },
      order: {
        status: order.status,
        paymentStatus: order.paymentStatus,
        paymentMethod: order.paymentMethod,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt
      },
      items: items.map(item => ({
        id: item.productId,
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        total: item.price * item.quantity,
        image: item.imageUrl || item.image
      })),
      summary: {
        subtotal: order.orderSummary.subtotal,
        tax: order.orderSummary.tax,
        shipping: order.orderSummary.shipping,
        discount: order.orderSummary.discount || 0,
        total: order.orderSummary.total
      },
      coupon: order.appliedCoupon || null,
      priority: this.calculateOrderPriority(order),
      actionRequired: this.getRequiredActions(order),
      estimatedProcessingTime: this.getEstimatedProcessingTime(order)
    };
  }

  // Calculate order priority for admin dashboard
  calculateOrderPriority(order) {
    let priority = 'normal';
    
    // High priority for high-value orders
    if (order.orderSummary.total > 10000) {
      priority = 'high';
    }
    
    // High priority for failed payments that need attention
    if (order.paymentStatus === 'failed') {
      priority = 'high';
    }
    
    // Medium priority for COD orders (require coordination)
    if (order.paymentMethod === 'cod') {
      priority = 'medium';
    }
    
    return priority;
  }

  // Get required actions for the order
  getRequiredActions(order) {
    const actions = [];
    
    switch (order.status) {
      case 'pending':
        actions.push('Review and confirm order');
        actions.push('Verify payment status');
        break;
      case 'confirmed':
        actions.push('Prepare items for packaging');
        actions.push('Generate packing slip');
        break;
      case 'processing':
        actions.push('Package items');
        actions.push('Generate shipping label');
        break;
      case 'shipped':
        actions.push('Update tracking information');
        actions.push('Send tracking details to customer');
        break;
    }
    
    // Payment-specific actions
    if (order.paymentMethod === 'cod') {
      actions.push('Coordinate COD collection with delivery team');
    }
    
    if (order.paymentStatus === 'pending' && order.paymentMethod !== 'cod') {
      actions.push('Follow up on pending payment');
    }
    
    return actions;
  }

  // Get estimated processing time
  getEstimatedProcessingTime(order) {
    const baseTime = 24; // 24 hours base processing time
    let estimatedHours = baseTime;
    
    // Add time for complex orders
    if (order.items.length > 5) {
      estimatedHours += 12; // Additional 12 hours for multiple items
    }
    
    // Add time for COD orders (requires coordination)
    if (order.paymentMethod === 'cod') {
      estimatedHours += 6;
    }
    
    // Reduce time for express locations (you can customize based on location)
    if (order.billingAddress.city.toLowerCase().includes('mumbai') || 
        order.billingAddress.city.toLowerCase().includes('bangalore') ||
        order.billingAddress.city.toLowerCase().includes('delhi')) {
      estimatedHours -= 6;
    }
    
    return Math.max(6, estimatedHours); // Minimum 6 hours
  }

  // Send notification to admin dashboard (future implementation)
  async sendDashboardNotification(orderData) {
    try {
      // This is where you would integrate with your admin dashboard
      // Examples of what you could do:
      
      // 1. Save to database for admin dashboard
      // await AdminNotification.create({
      //   type: 'new_order',
      //   data: orderData,
      //   priority: orderData.priority,
      //   read: false
      // });
      
      // 2. Send real-time notification via WebSocket
      // io.to('admin-room').emit('new_order', orderData);
      
      // 3. Send push notification
      // await this.sendPushNotification(orderData);
      
      // 4. Update admin dashboard counters
      // await this.updateDashboardCounters();
      
      console.log('📊 Dashboard notification prepared:', {
        orderNumber: orderData.orderNumber,
        priority: orderData.priority,
        actions: orderData.actionRequired.length
      });
      
    } catch (error) {
      console.error('Error sending dashboard notification:', error);
    }
  }

  // Update dashboard counters (future implementation)
  async updateDashboardCounters() {
    // This would update real-time counters on admin dashboard
    // Examples:
    // - Total pending orders
    // - Total orders today
    // - Revenue today
    // - Orders requiring action
  }

  // Send push notification (future implementation)
  async sendPushNotification(orderData) {
    // This would send push notifications to admin mobile app
    // or browser notifications
    
    const notification = {
      title: '🔔 New Order Received',
      body: `Order ${orderData.orderNumber} - ₹${orderData.summary.total.toFixed(2)}`,
      data: {
        orderNumber: orderData.orderNumber,
        amount: orderData.summary.total,
        priority: orderData.priority
      }
    };
    
    console.log('📱 Push notification ready:', notification);
  }

  // Generate order summary for quick admin view
  generateOrderSummary(order, items) {
    const summary = {
      orderNumber: order.orderNumber,
      customerName: `${order.billingAddress.firstName} ${order.billingAddress.lastName}`,
      total: order.orderSummary.total,
      itemCount: items.length,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      status: order.status,
      createdAt: order.createdAt,
      priority: this.calculateOrderPriority(order),
      requiresAction: order.paymentMethod === 'cod' || order.status === 'pending'
    };
    
    return summary;
  }

  // Log important metrics (for future analytics)
  logOrderMetrics(order, items) {
    console.log('📊 ORDER METRICS:');
    console.log(`- Order Value: ₹${order.orderSummary.total.toFixed(2)}`);
    console.log(`- Items Count: ${items.length}`);
    console.log(`- Payment Method: ${order.paymentMethod}`);
    console.log(`- Customer Location: ${order.billingAddress.city}, ${order.billingAddress.province}`);
    console.log(`- Order Priority: ${this.calculateOrderPriority(order)}`);
    
    if (order.appliedCoupon) {
      console.log(`- Coupon Used: ${order.appliedCoupon.code} (₹${order.appliedCoupon.discount} discount)`);
    }
  }

  // Generate alerts for special cases
  generateAlerts(order, items) {
    const alerts = [];
    
    // High value order alert
    if (order.orderSummary.total > 25000) {
      alerts.push({
        type: 'high_value',
        message: `High value order: ₹${order.orderSummary.total.toFixed(2)}`,
        priority: 'high'
      });
    }
    
    // Multiple items alert
    if (items.length > 10) {
      alerts.push({
        type: 'bulk_order',
        message: `Bulk order: ${items.length} items`,
        priority: 'medium'
      });
    }
    
    // COD alert
    if (order.paymentMethod === 'cod') {
      alerts.push({
        type: 'cod_coordination',
        message: 'COD order - coordinate with delivery team',
        priority: 'medium'
      });
    }
    
    // New customer alert (you can check if this is their first order)
    // This would require checking order history
    // alerts.push({
    //   type: 'new_customer',
    //   message: 'First time customer',
    //   priority: 'low'
    // });
    
    if (alerts.length > 0) {
      console.log('\n🚨 ALERTS:');
      alerts.forEach(alert => {
        console.log(`${alert.priority.toUpperCase()}: ${alert.message}`);
      });
    }
    
    return alerts;
  }
}

module.exports = AdminNotificationService;