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

  // Send Order Confirmation Email with PDF Buffer
  async sendOrderConfirmationEmailWithBuffer(order, items, pdfBuffer, filename) {
    try {
      const emailHTML = this.generateOrderConfirmationHTML(order, items);

      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: order.contactInfo.email,
        subject: `Order Confirmation - ${order.orderNumber}`,
        html: emailHTML,
        attachments: [
          {
            filename: filename,
            content: pdfBuffer,
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

  // Send Invoice Email with PDF Buffer (for paid orders)
  async sendInvoiceEmailWithBuffer(order, items, pdfBuffer, filename) {
    try {
      const emailHTML = this.generateInvoiceEmailHTML(order, items);

      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: order.contactInfo.email,
        subject: `Invoice - ${order.orderNumber}`,
        html: emailHTML,
        attachments: [
          {
            filename: filename,
            content: pdfBuffer,
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

  // Send Bill Email with PDF Buffer (for COD orders)
  async sendBillEmailWithBuffer(order, items, pdfBuffer, filename) {
    try {
      const emailHTML = this.generateBillEmailHTML(order, items);

      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: order.contactInfo.email,
        subject: `Order Bill - ${order.orderNumber}`,
        html: emailHTML,
        attachments: [
          {
            filename: filename,
            content: pdfBuffer,
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

  // Send Admin Notification Email with PDF Buffers
  async sendAdminNotificationEmailWithBuffer(order, items, attachments = []) {
    try {
      const emailHTML = this.generateAdminNotificationHTML(order, items);

      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: process.env.ADMIN_EMAIL || process.env.EMAIL_USER,
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

  // Send Payment Confirmation Email with Invoice Buffer
  async sendPaymentConfirmationEmailWithBuffer(order, items, invoiceBuffer, filename) {
    try {
      const emailHTML = this.generatePaymentConfirmationHTML(order, items);

      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: order.contactInfo.email,
        subject: `Payment Confirmed - Invoice ${order.orderNumber}`,
        html: emailHTML,
        attachments: [
          {
            filename: filename,
            content: invoiceBuffer,
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

  // Generate Order Confirmation Email HTML (Updated for CAD)
  generateOrderConfirmationHTML(order, items) {
    const itemsList = items.map(item => 
      `<tr>
        <td style="padding: 10px; border-bottom: 1px solid #ddd;">${item.name}</td>
        <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: center;">${item.quantity}</td>
        <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: right;">$${item.price.toFixed(2)}</td>
        <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: right;">$${(item.price * item.quantity).toFixed(2)}</td>
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
          <p><strong>Order Date:</strong> ${new Date(order.createdAt).toLocaleDateString('en-CA')}</p>
          <p><strong>Payment Status:</strong> ${order.paymentStatus.toUpperCase()}</p>
          <p><strong>Payment Method:</strong> ${order.paymentMethod.toUpperCase()}</p>
          <p><strong>Total Amount:</strong> $${order.orderSummary.total.toFixed(2)} CAD</p>
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

  // Generate Invoice Email HTML (Updated for CAD)
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
          <p><strong>Payment Date:</strong> ${new Date().toLocaleDateString('en-CA')}</p>
          <p><strong>Amount Paid:</strong> $${order.orderSummary.total.toFixed(2)} CAD</p>
          <p><strong>Payment Method:</strong> ${order.paymentMethod.toUpperCase()}</p>
        </div>

        <div style="background: #f8f9fa; padding: 15px; margin: 20px 0; border-radius: 5px;">
          <h3 style="margin: 0 0 10px 0; color: #059669;">Order Summary:</h3>
          <p>Subtotal: $${order.orderSummary.subtotal.toFixed(2)}</p>
          <p>Tax (HST): $${order.orderSummary.tax.toFixed(2)}</p>
          <p>Shipping: $${order.orderSummary.shipping.toFixed(2)}</p>
          ${order.orderSummary.discount > 0 ? `<p style="color: green;">Discount: -$${order.orderSummary.discount.toFixed(2)}</p>` : ''}
          <p><strong>Total Paid: $${order.orderSummary.total.toFixed(2)} CAD</strong></p>
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

  // Generate Bill Email HTML (for COD) - Updated for CAD
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
          <p><strong>Order Date:</strong> ${new Date(order.createdAt).toLocaleDateString('en-CA')}</p>
          <p><strong>Amount to Pay on Delivery:</strong> $${order.orderSummary.total.toFixed(2)} CAD</p>
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
          <p>Subtotal: $${order.orderSummary.subtotal.toFixed(2)}</p>
          <p>Tax (HST): $${order.orderSummary.tax.toFixed(2)}</p>
          <p>Shipping: $${order.orderSummary.shipping.toFixed(2)}</p>
          ${order.orderSummary.discount > 0 ? `<p style="color: green;">Discount: -$${order.orderSummary.discount.toFixed(2)}</p>` : ''}
          <p><strong>Total Amount: $${order.orderSummary.total.toFixed(2)} CAD</strong></p>
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

  // Generate Admin Notification HTML (Updated for CAD)
  generateAdminNotificationHTML(order, items) {
    const itemsList = items.map(item => 
      `<tr>
        <td style="padding: 8px; border-bottom: 1px solid #ddd;">${item.name}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: center;">${item.quantity}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">$${item.price.toFixed(2)}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">$${(item.price * item.quantity).toFixed(2)}</td>
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
          <p><strong>Order Date:</strong> ${new Date(order.createdAt).toLocaleString('en-CA')}</p>
          <p><strong>Payment Method:</strong> ${order.paymentMethod.toUpperCase()}</p>
          <p><strong>Payment Status:</strong> ${order.paymentStatus.toUpperCase()}</p>
          <p><strong>Order Status:</strong> ${order.status.toUpperCase()}</p>
          <p><strong>Total Amount:</strong> $${order.orderSummary.total.toFixed(2)} CAD</p>
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
          <p>Subtotal: $${order.orderSummary.subtotal.toFixed(2)}</p>
          <p>Tax (HST): $${order.orderSummary.tax.toFixed(2)}</p>
          <p>Shipping: $${order.orderSummary.shipping.toFixed(2)}</p>
          ${order.orderSummary.discount > 0 ? `<p style="color: green;">Discount: -$${order.orderSummary.discount.toFixed(2)}</p>` : ''}
          <p><strong>Total: $${order.orderSummary.total.toFixed(2)} CAD</strong></p>
        </div>

        ${order.appliedCoupon ? `
        <div style="background: #ecfdf5; padding: 15px; margin: 20px 0; border-radius: 5px;">
          <h3 style="margin: 0 0 10px 0; color: #059669;">Applied Coupon</h3>
          <p><strong>Code:</strong> ${order.appliedCoupon.code}</p>
          <p><strong>Discount:</strong> $${order.appliedCoupon.discount.toFixed(2)}</p>
        </div>
        ` : ''}

        <div style="background: ${order.paymentMethod === 'cod' ? '#fef3c7' : '#dbeafe'}; padding: 15px; margin: 20px 0; border-radius: 5px;">
          <h3 style="margin: 0 0 10px 0; color: ${order.paymentMethod === 'cod' ? '#92400e' : '#1e40af'};">
            ${order.paymentMethod === 'cod' ? '💰 Cash on Delivery' : '💳 Card Payment'}
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
          <p>Generated on: ${new Date().toLocaleString('en-CA')}</p>
        </div>
      </div>
    </body>
    </html>`;
  }

  // Generate Payment Confirmation HTML (Updated for CAD)
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
          <p><strong>Payment Date:</strong> ${new Date().toLocaleDateString('en-CA')}</p>
          <p><strong>Amount Paid:</strong> $${order.orderSummary.total.toFixed(2)} CAD</p>
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

  // Legacy methods (kept for backward compatibility)
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

  async sendAdminNotificationEmail(order, items, attachments = []) {
    try {
      const emailHTML = this.generateAdminNotificationHTML(order, items);

      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: process.env.ADMIN_EMAIL || process.env.EMAIL_USER,
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

  // COD Order Cancellation Email
async sendCODCancellationEmail(order, user) {
  try {
    const subject = `Order Cancelled - ${order.orderNumber}`;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #dc2626; margin: 0;">Order Cancelled</h1>
        </div>
        
        <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
          <h2 style="color: #dc2626; margin-top: 0;">Order Cancellation Confirmation</h2>
          <p>Dear ${order.billingAddress.firstName} ${order.billingAddress.lastName},</p>
          <p>Your order has been successfully cancelled as requested.</p>
        </div>

        <div style="background-color: #f9fafb; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
          <h3 style="margin-top: 0; color: #374151;">Order Details</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><strong>Order Number:</strong></td>
              <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">${order.orderNumber}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><strong>Order Date:</strong></td>
              <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">${new Date(order.createdAt).toLocaleDateString()}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><strong>Total Amount:</strong></td>
              <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">$${order.orderSummary.total.toFixed(2)} CAD</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><strong>Payment Method:</strong></td>
              <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">Cash on Delivery (COD)</td>
            </tr>
            <tr>
              <td style="padding: 8px 0;"><strong>Cancellation Reason:</strong></td>
              <td style="padding: 8px 0;">${order.cancellationReason || 'Customer requested cancellation'}</td>
            </tr>
          </table>
        </div>

        <div style="background-color: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
          <h3 style="margin-top: 0; color: #0369a1;">What happens next?</h3>
          <ul style="margin: 0; padding-left: 20px; color: #374151;">
            <li>Since this was a COD order, no payment refund is necessary</li>
            <li>You can place a new order anytime if you change your mind</li>
            <li>If you have any questions, please contact our customer service</li>
          </ul>
        </div>

        <div style="text-align: center; margin-top: 30px;">
          <p style="color: #6b7280; font-size: 14px;">
            Thank you for choosing us. We hope to serve you again soon!
          </p>
        </div>
      </div>
    `;

    await this.transporter.sendMail({
      from: this.fromEmail,
      to: order.contactInfo.email,
      subject: subject,
      html: html
    });

    console.log(`COD cancellation email sent for order ${order.orderNumber}`);
  } catch (error) {
    console.error('Error sending COD cancellation email:', error);
    throw error;
  }
}

// Card Order Cancellation with Refund Email
async sendCardCancellationEmail(order, refundInfo, user) {
  try {
    const subject = `Order Cancelled & Refund Initiated - ${order.orderNumber}`;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #dc2626; margin: 0;">Order Cancelled</h1>
        </div>
        
        <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
          <h2 style="color: #dc2626; margin-top: 0;">Order Cancellation & Refund</h2>
          <p>Dear ${order.billingAddress.firstName} ${order.billingAddress.lastName},</p>
          <p>Your order has been successfully cancelled and a refund has been initiated.</p>
        </div>

        <div style="background-color: #f9fafb; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
          <h3 style="margin-top: 0; color: #374151;">Order Details</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><strong>Order Number:</strong></td>
              <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">${order.orderNumber}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><strong>Order Date:</strong></td>
              <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">${new Date(order.createdAt).toLocaleDateString()}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><strong>Total Amount:</strong></td>
              <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">$${order.orderSummary.total.toFixed(2)} CAD</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><strong>Payment Method:</strong></td>
              <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">Credit/Debit Card</td>
            </tr>
            <tr>
              <td style="padding: 8px 0;"><strong>Cancellation Reason:</strong></td>
              <td style="padding: 8px 0;">${order.cancellationReason || 'Customer requested cancellation'}</td>
            </tr>
          </table>
        </div>

        <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
          <h3 style="margin-top: 0; color: #166534;">Refund Information</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #dcfce7;"><strong>Refund Amount:</strong></td>
              <td style="padding: 8px 0; border-bottom: 1px solid #dcfce7;">$${refundInfo?.amount?.toFixed(2) || order.orderSummary.total.toFixed(2)} CAD</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #dcfce7;"><strong>Refund Status:</strong></td>
              <td style="padding: 8px 0; border-bottom: 1px solid #dcfce7;">${refundInfo?.status === 'processing' ? 'Processing' : 'Initiated'}</td>
            </tr>
            ${refundInfo?.refundId ? `
            <tr>
              <td style="padding: 8px 0;"><strong>Refund ID:</strong></td>
              <td style="padding: 8px 0;">${refundInfo.refundId}</td>
            </tr>
            ` : ''}
          </table>
        </div>

        <div style="background-color: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
          <h3 style="margin-top: 0; color: #0369a1;">Refund Timeline</h3>
          <ul style="margin: 0; padding-left: 20px; color: #374151;">
            <li><strong>Immediate:</strong> Refund has been initiated with your bank/card provider</li>
            <li><strong>3-5 business days:</strong> Refund should appear in your account</li>
            <li><strong>If not received:</strong> Please contact your bank or our customer service</li>
          </ul>
        </div>

        <div style="text-align: center; margin-top: 30px;">
          <p style="color: #6b7280; font-size: 14px;">
            We apologize for any inconvenience. Thank you for your understanding!
          </p>
        </div>
      </div>
    `;

    await this.transporter.sendMail({
      from: this.fromEmail,
      to: order.contactInfo.email,
      subject: subject,
      html: html
    });

    console.log(`Card cancellation email sent for order ${order.orderNumber}`);
  } catch (error) {
    console.error('Error sending card cancellation email:', error);
    throw error;
  }
}

// Refund Completion Email
async sendRefundCompletionEmail(order, refund, user) {
  try {
    const subject = `Refund Completed - ${order.orderNumber}`;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #16a34a; margin: 0;">Refund Completed</h1>
        </div>
        
        <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
          <h2 style="color: #166534; margin-top: 0;">Your Refund Has Been Processed</h2>
          <p>Dear ${refund.customerInfo.firstName} ${refund.customerInfo.lastName},</p>
          <p>Great news! Your refund has been successfully processed and should now be available in your account.</p>
        </div>

        <div style="background-color: #f9fafb; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
          <h3 style="margin-top: 0; color: #374151;">Refund Details</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><strong>Order Number:</strong></td>
              <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">${order.orderNumber}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><strong>Refund Amount:</strong></td>
              <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">${refund.refundAmount.toFixed(2)} CAD</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><strong>Refund ID:</strong></td>
              <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">${refund.stripeRefundId}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><strong>Processed Date:</strong></td>
              <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">${new Date(refund.processedAt).toLocaleDateString()}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0;"><strong>Status:</strong></td>
              <td style="padding: 8px 0;"><span style="color: #16a34a; font-weight: bold;">Completed</span></td>
            </tr>
          </table>
        </div>

        <div style="background-color: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
          <h3 style="margin-top: 0; color: #0369a1;">Important Notes</h3>
          <ul style="margin: 0; padding-left: 20px; color: #374151;">
            <li>The refund has been credited to your original payment method</li>
            <li>It may take 1-2 business days to reflect in your bank statement</li>
            <li>Keep this email as a record of your refund</li>
            <li>If you have any questions, please contact our customer service</li>
          </ul>
        </div>

        <div style="text-align: center; margin-top: 30px;">
          <p style="color: #6b7280; font-size: 14px;">
            Thank you for your patience. We hope to serve you again soon!
          </p>
        </div>
      </div>
    `;

    await this.transporter.sendMail({
      from: this.fromEmail,
      to: refund.customerInfo.email,
      subject: subject,
      html: html
    });

    console.log(`Refund completion email sent for order ${order.orderNumber}`);
  } catch (error) {
    console.error('Error sending refund completion email:', error);
    throw error;
  }
}

// Admin Cancellation Notification
async sendAdminCancellationNotification(order, refundInfo, user) {
  try {
    const subject = `Order Cancellation Alert - ${order.orderNumber}`;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #dc2626; margin: 0;">Order Cancellation Alert</h1>
        </div>
        
        <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
          <h2 style="color: #dc2626; margin-top: 0;">Customer Cancelled Order</h2>
          <p>A customer has cancelled their order. Please review the details below:</p>
        </div>

        <div style="background-color: #f9fafb; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
          <h3 style="margin-top: 0; color: #374151;">Order Information</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><strong>Order Number:</strong></td>
              <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">${order.orderNumber}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><strong>Customer:</strong></td>
              <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">${order.billingAddress.firstName} ${order.billingAddress.lastName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><strong>Email:</strong></td>
              <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">${order.contactInfo.email}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><strong>Order Date:</strong></td>
              <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">${new Date(order.createdAt).toLocaleDateString()}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><strong>Cancelled Date:</strong></td>
              <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">${new Date(order.cancelledAt).toLocaleDateString()}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><strong>Total Amount:</strong></td>
              <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">${order.orderSummary.total.toFixed(2)} CAD</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><strong>Payment Method:</strong></td>
              <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">${order.paymentMethod.toUpperCase()}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0;"><strong>Cancellation Reason:</strong></td>
              <td style="padding: 8px 0;">${order.cancellationReason || 'Customer requested cancellation'}</td>
            </tr>
          </table>
        </div>

        ${refundInfo ? `
        <div style="background-color: #fef3c7; border: 1px solid #fbbf24; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
          <h3 style="margin-top: 0; color: #92400e;">Refund Information</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #fed7aa;"><strong>Refund Amount:</strong></td>
              <td style="padding: 8px 0; border-bottom: 1px solid #fed7aa;">${refundInfo.amount?.toFixed(2)} CAD</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #fed7aa;"><strong>Refund Status:</strong></td>
              <td style="padding: 8px 0; border-bottom: 1px solid #fed7aa;">${refundInfo.status}</td>
            </tr>
            ${refundInfo.refundId ? `
            <tr>
              <td style="padding: 8px 0;"><strong>Stripe Refund ID:</strong></td>
              <td style="padding: 8px 0;">${refundInfo.refundId}</td>
            </tr>
            ` : ''}
          </table>
        </div>
        ` : ''}

        <div style="background-color: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
          <h3 style="margin-top: 0; color: #0369a1;">Action Required</h3>
          <ul style="margin: 0; padding-left: 20px; color: #374151;">
            <li>Review the cancellation reason for potential improvements</li>
            <li>Update inventory if products were allocated</li>
            ${order.paymentMethod === 'card' ? '<li>Monitor refund status in Stripe dashboard</li>' : '<li>No refund processing required for COD order</li>'}
            <li>Consider following up with customer feedback survey</li>
          </ul>
        </div>

        <div style="text-align: center; margin-top: 30px;">
          <p style="color: #6b7280; font-size: 14px;">
            This is an automated notification from your e-commerce system.
          </p>
        </div>
      </div>
    `;

    // Send to admin email (you should have this in your environment variables)
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@yourdomain.com';
    
    await this.transporter.sendMail({
      from: this.fromEmail,
      to: adminEmail,
      subject: subject,
      html: html
    });

    console.log(`Admin cancellation notification sent for order ${order.orderNumber}`);
  } catch (error) {
    console.error('Error sending admin cancellation notification:', error);
    throw error;
  }
}
}

module.exports = EmailService;