
const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs');

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });
  }

  // Send Order Confirmation Email with PDF
  async sendOrderConfirmationEmail(order, items, pdfPath) {
    try {
      const emailHTML = this.generateOrderConfirmationHTML(order, items);

      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: order.contactInfo.email,
        subject: `Order Confirmation - ${order.orderNumber}`,
        html: emailHTML,
        attachments: [
          {
            filename: `Order-Confirmation-${order.orderNumber}.pdf`,
            path: pdfPath,
            contentType: 'application/pdf'
          }
        ]
      };

      await this.transporter.sendMail(mailOptions);
      console.log('Order confirmation email sent successfully with PDF attachment');
    } catch (error) {
      console.error('Error sending order confirmation email:', error);
      throw error;
    }
  }

  // Send Invoice Email with PDF (for paid orders)
  async sendInvoiceEmail(order, items, pdfPath) {
    try {
      const emailHTML = this.generateInvoiceEmailHTML(order, items);

      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: order.contactInfo.email,
        subject: `Invoice - ${order.orderNumber}`,
        html: emailHTML,
        attachments: [
          {
            filename: `Invoice-${order.orderNumber}.pdf`,
            path: pdfPath,
            contentType: 'application/pdf'
          }
        ]
      };

      await this.transporter.sendMail(mailOptions);
      console.log('Invoice email sent successfully with PDF attachment');
    } catch (error) {
      console.error('Error sending invoice email:', error);
      throw error;
    }
  }

  // Send Bill Email with PDF (for COD orders)
  async sendBillEmail(order, items, pdfPath) {
    try {
      const emailHTML = this.generateBillEmailHTML(order, items);

      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: order.contactInfo.email,
        subject: `Order Bill - ${order.orderNumber}`,
        html: emailHTML,
        attachments: [
          {
            filename: `Bill-${order.orderNumber}.pdf`,
            path: pdfPath,
            contentType: 'application/pdf'
          }
        ]
      };

      await this.transporter.sendMail(mailOptions);
      console.log('Bill email sent successfully with PDF attachment');
    } catch (error) {
      console.error('Error sending bill email:', error);
      throw error;
    }
  }

  // Send Admin Notification Email
  async sendAdminNotificationEmail(order, items, attachments = []) {
    try {
      const emailHTML = this.generateAdminNotificationHTML(order, items);

      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: process.env.ADMIN_EMAIL || process.env.EMAIL_USER, // Add ADMIN_EMAIL to your .env
        subject: `New Order Received - ${order.orderNumber}`,
        html: emailHTML,
        attachments: attachments
      };

      await this.transporter.sendMail(mailOptions);
      console.log('Admin notification email sent successfully');
    } catch (error) {
      console.error('Error sending admin notification email:', error);
      throw error;
    }
  }

  // Send Payment Confirmation Email with Invoice
  async sendPaymentConfirmationEmail(order, items, invoicePdfPath) {
    try {
      const emailHTML = this.generatePaymentConfirmationHTML(order, items);

      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: order.contactInfo.email,
        subject: `Payment Confirmed - Invoice ${order.orderNumber}`,
        html: emailHTML,
        attachments: [
          {
            filename: `Invoice-${order.orderNumber}.pdf`,
            path: invoicePdfPath,
            contentType: 'application/pdf'
          }
        ]
      };

      await this.transporter.sendMail(mailOptions);
      console.log('Payment confirmation email sent successfully with invoice');
    } catch (error) {
      console.error('Error sending payment confirmation email:', error);
      throw error;
    }
  }

  // Generate Order Confirmation Email HTML
  generateOrderConfirmationHTML(order, items) {
    const itemsList = items.map(item => 
      `<tr>
        <td style="padding: 10px; border-bottom: 1px solid #ddd;">${item.name}</td>
        <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: center;">${item.quantity}</td>
        <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: right;">₹${item.price.toFixed(2)}</td>
        <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: right;">₹${(item.price * item.quantity).toFixed(2)}</td>
      </tr>`
    ).join('');

    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Order Confirmation</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; margin: 0; padding: 20px;">
      <div style="max-width: 600px; margin: 0 auto; border: 1px solid #ddd; padding: 20px;">
        <h2 style="color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px;">Order Confirmation</h2>
        
        <p>Dear ${order.billingAddress.firstName} ${order.billingAddress.lastName},</p>
        <p>Thank you for your order! Your order has been confirmed. Please find the detailed order confirmation PDF attached.</p>
        
        <div style="background: #f8f9fa; padding: 15px; margin: 20px 0; border-radius: 5px;">
          <h3 style="margin: 0 0 10px 0; color: #007bff;">Order Details:</h3>
          <p><strong>Order Number:</strong> ${order.orderNumber}</p>
          <p><strong>Order Date:</strong> ${new Date(order.createdAt).toLocaleDateString('en-IN')}</p>
          <p><strong>Payment Status:</strong> ${order.paymentStatus.toUpperCase()}</p>
          <p><strong>Payment Method:</strong> ${order.paymentMethod.toUpperCase()}</p>
          <p><strong>Total Amount:</strong> ₹${order.orderSummary.total.toFixed(2)}</p>
        </div>

        <h3>Items Ordered:</h3>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <thead>
            <tr style="background: #007bff; color: white;">
              <th style="padding: 10px; text-align: left;">Product</th>
              <th style="padding: 10px; text-align: center;">Qty</th>
              <th style="padding: 10px; text-align: right;">Price</th>
              <th style="padding: 10px; text-align: right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsList}
          </tbody>
        </table>

        <div style="margin-top: 30px; padding: 20px; background: #e9ecef; border-radius: 5px;">
          <p><strong>What's Next?</strong></p>
          <ul>
            <li>We'll process your order within 1-2 business days</li>
            <li>You'll receive a shipping confirmation email once your order is dispatched</li>
            <li>Track your order using Order Number: <strong>${order.orderNumber}</strong></li>
            ${order.paymentMethod === 'cod' ? '<li><strong>Cash on Delivery:</strong> Payment will be collected upon delivery</li>' : ''}
          </ul>
        </div>

        <p style="margin-top: 20px;">If you have any questions about your order, please contact us.</p>
        <p>Thank you for shopping with us!</p>
        
        <div style="margin-top: 30px; text-align: center; color: #666; font-size: 12px;">
          <p>This is an automated email. Please do not reply to this email.</p>
        </div>
      </div>
    </body>
    </html>`;
  }

  // Generate Invoice Email HTML
  generateInvoiceEmailHTML(order, items) {
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Invoice</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; margin: 0; padding: 20px;">
      <div style="max-width: 600px; margin: 0 auto; border: 1px solid #ddd; padding: 20px;">
        <h2 style="color: #dc2626; border-bottom: 2px solid #dc2626; padding-bottom: 10px;">Invoice</h2>
        
        <p>Dear ${order.billingAddress.firstName} ${order.billingAddress.lastName},</p>
        <p>Thank you for your payment! Your invoice is attached to this email.</p>
        
        <div style="background: #f0f9ff; padding: 15px; margin: 20px 0; border-radius: 5px; border-left: 4px solid #3b82f6;">
          <h3 style="margin: 0 0 10px 0; color: #1e40af;">Payment Confirmed ✅</h3>
          <p><strong>Invoice Number:</strong> INV-${order.orderNumber}</p>
          <p><strong>Order Number:</strong> ${order.orderNumber}</p>
          <p><strong>Payment Date:</strong> ${new Date().toLocaleDateString('en-IN')}</p>
          <p><strong>Amount Paid:</strong> ₹${order.orderSummary.total.toFixed(2)}</p>
          <p><strong>Payment Method:</strong> ${order.paymentMethod.toUpperCase()}</p>
        </div>

        <div style="background: #f8f9fa; padding: 15px; margin: 20px 0; border-radius: 5px;">
          <h3 style="margin: 0 0 10px 0; color: #059669;">Order Summary:</h3>
          <p>Subtotal: ₹${order.orderSummary.subtotal.toFixed(2)}</p>
          <p>Tax (GST): ₹${order.orderSummary.tax.toFixed(2)}</p>
          <p>Shipping: ₹${order.orderSummary.shipping.toFixed(2)}</p>
          ${order.orderSummary.discount > 0 ? `<p style="color: green;">Discount: -₹${order.orderSummary.discount.toFixed(2)}</p>` : ''}
          <p><strong>Total Paid: ₹${order.orderSummary.total.toFixed(2)}</strong></p>
        </div>

        <p>Your order is now being processed. You'll receive another email with tracking information once your order ships.</p>
        
        <p>Thank you for your business!</p>
        
        <div style="margin-top: 30px; text-align: center; color: #666; font-size: 12px;">
          <p>This is an automated email. Please do not reply to this email.</p>
        </div>
      </div>
    </body>
    </html>`;
  }

  // Generate Bill Email HTML (for COD)
  generateBillEmailHTML(order, items) {
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Order Bill</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; margin: 0; padding: 20px;">
      <div style="max-width: 600px; margin: 0 auto; border: 1px solid #ddd; padding: 20px;">
        <h2 style="color: #f59e0b; border-bottom: 2px solid #f59e0b; padding-bottom: 10px;">Order Bill</h2>
        
        <p>Dear ${order.billingAddress.firstName} ${order.billingAddress.lastName},</p>
        <p>Your order has been confirmed for Cash on Delivery. Please find the bill attached for your reference.</p>
        
        <div style="background: #fef3c7; padding: 15px; margin: 20px 0; border-radius: 5px; border-left: 4px solid #f59e0b;">
          <h3 style="margin: 0 0 10px 0; color: #92400e;">💰 Cash on Delivery</h3>
          <p><strong>Bill Number:</strong> BILL-${order.orderNumber}</p>
          <p><strong>Order Number:</strong> ${order.orderNumber}</p>
          <p><strong>Order Date:</strong> ${new Date(order.createdAt).toLocaleDateString('en-IN')}</p>
          <p><strong>Amount to Pay on Delivery:</strong> ₹${order.orderSummary.total.toFixed(2)}</p>
        </div>

        <div style="background: #fee2e2; padding: 15px; margin: 20px 0; border-radius: 5px; border-left: 4px solid #dc2626;">
          <h3 style="margin: 0 0 10px 0; color: #991b1b;">Important Instructions:</h3>
          <ul style="margin: 0; padding-left: 20px;">
            <li>Please keep this bill ready during delivery</li>
            <li>Payment should be made to the delivery person only</li>
            <li>Please arrange exact change if possible</li>
            <li>You'll receive an invoice after payment is completed</li>
          </ul>
        </div>

        <div style="background: #f0fdf4; padding: 15px; margin: 20px 0; border-radius: 5px;">
          <h3 style="margin: 0 0 10px 0; color: #166534;">Order Summary:</h3>
          <p>Subtotal: ₹${order.orderSummary.subtotal.toFixed(2)}</p>
          <p>Tax (GST): ₹${order.orderSummary.tax.toFixed(2)}</p>
          <p>Shipping: ₹${order.orderSummary.shipping.toFixed(2)}</p>
          ${order.orderSummary.discount > 0 ? `<p style="color: green;">Discount: -₹${order.orderSummary.discount.toFixed(2)}</p>` : ''}
          <p><strong>Total Amount: ₹${order.orderSummary.total.toFixed(2)}</strong></p>
        </div>

        <p>We'll send you tracking information once your order is dispatched.</p>
        <p>Thank you for your order!</p>
        
        <div style="margin-top: 30px; text-align: center; color: #666; font-size: 12px;">
          <p>This is an automated email. Please do not reply to this email.</p>
        </div>
      </div>
    </body>
    </html>`;
  }

  // Generate Admin Notification HTML
  generateAdminNotificationHTML(order, items) {
    const itemsList = items.map(item => 
      `<tr>
        <td style="padding: 8px; border-bottom: 1px solid #ddd;">${item.name}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: center;">${item.quantity}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">₹${item.price.toFixed(2)}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">₹${(item.price * item.quantity).toFixed(2)}</td>
      </tr>`
    ).join('');

    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>New Order Notification</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; margin: 0; padding: 20px;">
      <div style="max-width: 700px; margin: 0 auto; border: 1px solid #ddd; padding: 20px;">
        <h2 style="color: #059669; border-bottom: 2px solid #059669; padding-bottom: 10px;">🔔 New Order Received</h2>
        
        <div style="background: #f0fdf4; padding: 15px; margin: 20px 0; border-radius: 5px; border-left: 4px solid #059669;">
          <h3 style="margin: 0 0 10px 0; color: #166534;">Order Details</h3>
          <p><strong>Order Number:</strong> ${order.orderNumber}</p>
          <p><strong>Order Date:</strong> ${new Date(order.createdAt).toLocaleString('en-IN')}</p>
          <p><strong>Payment Method:</strong> ${order.paymentMethod.toUpperCase()}</p>
          <p><strong>Payment Status:</strong> ${order.paymentStatus.toUpperCase()}</p>
          <p><strong>Order Status:</strong> ${order.status.toUpperCase()}</p>
          <p><strong>Total Amount:</strong> ₹${order.orderSummary.total.toFixed(2)}</p>
        </div>

        <div style="background: #f8f9fa; padding: 15px; margin: 20px 0; border-radius: 5px;">
          <h3 style="margin: 0 0 10px 0; color: #374151;">Customer Information</h3>
          <p><strong>Name:</strong> ${order.billingAddress.firstName} ${order.billingAddress.lastName}</p>
          <p><strong>Email:</strong> ${order.contactInfo.email}</p>
          <p><strong>Phone:</strong> ${order.billingAddress.phone || 'Not provided'}</p>
          <p><strong>Address:</strong><br>
             ${order.billingAddress.address}<br>
             ${order.billingAddress.apartment ? order.billingAddress.apartment + '<br>' : ''}
             ${order.billingAddress.city}, ${order.billingAddress.province} ${order.billingAddress.postalCode}<br>
             ${order.billingAddress.country}
          </p>
        </div>

        <h3>Ordered Items:</h3>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <thead>
            <tr style="background: #059669; color: white;">
              <th style="padding: 10px; text-align: left;">Product</th>
              <th style="padding: 10px; text-align: center;">Qty</th>
              <th style="padding: 10px; text-align: right;">Price</th>
              <th style="padding: 10px; text-align: right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsList}
          </tbody>
        </table>

        <div style="background: #f3f4f6; padding: 15px; margin: 20px 0; border-radius: 5px;">
          <h3 style="margin: 0 0 10px 0; color: #374151;">Order Summary</h3>
          <p>Subtotal: ₹${order.orderSummary.subtotal.toFixed(2)}</p>
          <p>Tax (GST): ₹${order.orderSummary.tax.toFixed(2)}</p>
          <p>Shipping: ₹${order.orderSummary.shipping.toFixed(2)}</p>
          ${order.orderSummary.discount > 0 ? `<p style="color: green;">Discount: -₹${order.orderSummary.discount.toFixed(2)}</p>` : ''}
          <p><strong>Total: ₹${order.orderSummary.total.toFixed(2)}</strong></p>
        </div>

        ${order.appliedCoupon ? `
        <div style="background: #ecfdf5; padding: 15px; margin: 20px 0; border-radius: 5px;">
          <h3 style="margin: 0 0 10px 0; color: #059669;">Applied Coupon</h3>
          <p><strong>Code:</strong> ${order.appliedCoupon.code}</p>
          <p><strong>Discount:</strong> ₹${order.appliedCoupon.discount.toFixed(2)}</p>
        </div>
        ` : ''}

        <div style="background: ${order.paymentMethod === 'cod' ? '#fef3c7' : '#dbeafe'}; padding: 15px; margin: 20px 0; border-radius: 5px;">
          <h3 style="margin: 0 0 10px 0; color: ${order.paymentMethod === 'cod' ? '#92400e' : '#1e40af'};">
            ${order.paymentMethod === 'cod' ? '💰 Cash on Delivery' : '💳 Online Payment'}
          </h3>
          ${order.paymentMethod === 'cod' 
            ? '<p><strong>Action Required:</strong> Prepare for COD delivery and collection</p>'
            : `<p><strong>Payment Status:</strong> ${order.paymentStatus.toUpperCase()}</p>
               ${order.stripePaymentId ? `<p><strong>Payment ID:</strong> ${order.stripePaymentId}</p>` : ''}`
          }
        </div>

        <div style="background: #fee2e2; padding: 15px; margin: 20px 0; border-radius: 5px; border-left: 4px solid #dc2626;">
          <h3 style="margin: 0 0 10px 0; color: #991b1b;">⚡ Action Required</h3>
          <ul style="margin: 0; padding-left: 20px;">
            <li>Update order status in admin dashboard</li>
            <li>Process the order for fulfillment</li>
            <li>Prepare items for packaging</li>
            ${order.paymentMethod === 'cod' ? '<li>Coordinate with delivery team for COD collection</li>' : '<li>Payment confirmed - ready for immediate processing</li>'}
          </ul>
        </div>

        <p style="text-align: center; margin-top: 30px;">
          <strong>Login to Admin Dashboard to manage this order</strong>
        </p>
        
        <div style="margin-top: 30px; text-align: center; color: #666; font-size: 12px;">
          <p>This is an automated notification from your e-commerce system.</p>
          <p>Generated on: ${new Date().toLocaleString('en-IN')}</p>
        </div>
      </div>
    </body>
    </html>`;
  }

  // Generate Payment Confirmation HTML
  generatePaymentConfirmationHTML(order, items) {
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Payment Confirmation</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; margin: 0; padding: 20px;">
      <div style="max-width: 600px; margin: 0 auto; border: 1px solid #ddd; padding: 20px;">
        <h2 style="color: #059669; border-bottom: 2px solid #059669; padding-bottom: 10px;">✅ Payment Confirmed</h2>
        
        <p>Dear ${order.billingAddress.firstName} ${order.billingAddress.lastName},</p>
        <p>Great news! Your payment has been successfully processed. Your invoice is attached to this email.</p>
        
        <div style="background: #f0fdf4; padding: 15px; margin: 20px 0; border-radius: 5px; border-left: 4px solid #059669;">
          <h3 style="margin: 0 0 10px 0; color: #166534;">Payment Details</h3>
          <p><strong>Order Number:</strong> ${order.orderNumber}</p>
          <p><strong>Payment Date:</strong> ${new Date().toLocaleDateString('en-IN')}</p>
          <p><strong>Amount Paid:</strong> ₹${order.orderSummary.total.toFixed(2)}</p>
          <p><strong>Payment Method:</strong> ${order.paymentMethod.toUpperCase()}</p>
          <p><strong>Payment Status:</strong> PAID ✅</p>
        </div>

        <div style="background: #f8f9fa; padding: 15px; margin: 20px 0; border-radius: 5px;">
          <h3 style="margin: 0 0 10px 0; color: #374151;">What happens next?</h3>
          <ul style="margin: 0; padding-left: 20px;">
            <li>Your order is now being processed</li>
            <li>You'll receive shipping confirmation within 1-2 business days</li>
            <li>Track your order using order number: <strong>${order.orderNumber}</strong></li>
            <li>Keep your invoice for warranty and returns</li>
          </ul>
        </div>

        <p>Thank you for your purchase!</p>
        
        <div style="margin-top: 30px; text-align: center; color: #666; font-size: 12px;">
          <p>This is an automated email. Please do not reply to this email.</p>
        </div>
      </div>
    </body>
    </html>`;
  }

  // Clean up temporary files
  cleanupTempFiles(filePaths) {
    filePaths.forEach(filePath => {
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
          console.log(`Cleaned up temp file: ${filePath}`);
        } catch (error) {
          console.error(`Error cleaning up temp file ${filePath}:`, error);
        }
      }
    });
  }
}

module.exports = EmailService;