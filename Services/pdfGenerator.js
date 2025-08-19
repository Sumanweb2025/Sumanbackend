// services/pdfGenerator.service.js
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

class PDFGeneratorService {
  // Generate Order Confirmation PDF
  static async generateOrderConfirmationPDF(order, items, outputPath) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50 });
        doc.pipe(fs.createWriteStream(outputPath));

        // Header
        doc.fontSize(20)
           .text('ORDER CONFIRMATION', 50, 50, { align: 'center' })
           .moveDown();

        // Company Info (Add your company details)
        doc.fontSize(12)
           .text('Your Company Name', 50, 100)
           .text('Your Company Address', 50, 115)
           .text('Email: your-email@company.com', 50, 130)
           .text('Phone: +91-XXXXXXXXXX', 50, 145);

        // Order Details Box
        doc.rect(50, 170, 500, 120).stroke();
        doc.fontSize(14)
           .fillColor('#007bff')
           .text('Order Details', 60, 180)
           .fillColor('black')
           .fontSize(10)
           .text(`Order Number: ${order.orderNumber}`, 60, 200)
           .text(`Order Date: ${new Date(order.createdAt).toLocaleDateString('en-IN')}`, 60, 215)
           .text(`Payment Status: ${order.paymentStatus.toUpperCase()}`, 60, 230)
           .text(`Payment Method: ${order.paymentMethod.toUpperCase()}`, 60, 245)
           .text(`Order Status: ${order.status.toUpperCase()}`, 60, 260);

        // Customer Information
        const startY = 310;
        doc.fontSize(14)
           .fillColor('#007bff')
           .text('Billing Address', 50, startY)
           .fillColor('black')
           .fontSize(10)
           .text(`${order.billingAddress.firstName} ${order.billingAddress.lastName}`, 50, startY + 20)
           .text(`${order.billingAddress.address}`, 50, startY + 35);

        if (order.billingAddress.apartment) {
          doc.text(`${order.billingAddress.apartment}`, 50, startY + 50);
        }

        doc.text(`${order.billingAddress.city}, ${order.billingAddress.province} ${order.billingAddress.postalCode}`, 50, startY + 65)
           .text(`${order.billingAddress.country}`, 50, startY + 80);

        if (order.billingAddress.phone) {
          doc.text(`Phone: ${order.billingAddress.phone}`, 50, startY + 95);
        }

        // Items Table Header
        const tableTop = startY + 130;
        doc.fontSize(12)
           .fillColor('#007bff')
           .text('Items Ordered', 50, tableTop)
           .fillColor('black');

        // Table Headers
        const itemsTableTop = tableTop + 25;
        doc.fontSize(10)
           .text('Product', 50, itemsTableTop)
           .text('Quantity', 200, itemsTableTop)
           .text('Price', 300, itemsTableTop)
           .text('Total', 450, itemsTableTop);

        // Draw line under headers
        doc.moveTo(50, itemsTableTop + 15)
           .lineTo(550, itemsTableTop + 15)
           .stroke();

        // Items
        let yPosition = itemsTableTop + 25;
        items.forEach((item, index) => {
          doc.text(item.name.substring(0, 25) + (item.name.length > 25 ? '...' : ''), 50, yPosition)
             .text(item.quantity.toString(), 200, yPosition)
             .text(`₹${item.price.toFixed(2)}`, 300, yPosition)
             .text(`₹${(item.price * item.quantity).toFixed(2)}`, 450, yPosition);
          
          yPosition += 20;
          
          // Add new page if needed
          if (yPosition > 700) {
            doc.addPage();
            yPosition = 50;
          }
        });

        // Summary Box
        const summaryTop = yPosition + 20;
        doc.rect(350, summaryTop, 200, 120).stroke();
        
        doc.fontSize(12)
           .fillColor('#007bff')
           .text('Order Summary', 360, summaryTop + 10)
           .fillColor('black')
           .fontSize(10)
           .text(`Subtotal: ₹${order.orderSummary.subtotal.toFixed(2)}`, 360, summaryTop + 30)
           .text(`Tax (GST): ₹${order.orderSummary.tax.toFixed(2)}`, 360, summaryTop + 45)
           .text(`Shipping: ₹${order.orderSummary.shipping.toFixed(2)}`, 360, summaryTop + 60);

        if (order.orderSummary.discount > 0) {
          doc.fillColor('green')
             .text(`Discount: -₹${order.orderSummary.discount.toFixed(2)}`, 360, summaryTop + 75)
             .fillColor('black');
        }

        doc.fontSize(12)
           .fillColor('#007bff')
           .text(`Total: ₹${order.orderSummary.total.toFixed(2)}`, 360, summaryTop + 95)
           .fillColor('black');

        // Footer
        const footerTop = summaryTop + 150;
        doc.fontSize(10)
           .fillColor('gray')
           .text('Thank you for your order! For any queries, please contact us.', 50, footerTop)
           .text('This is a computer generated document.', 50, footerTop + 15);

        doc.end();

        doc.on('end', () => {
          resolve(outputPath);
        });

      } catch (error) {
        reject(error);
      }
    });
  }

  // Generate Invoice PDF (for paid orders)
  static async generateInvoicePDF(order, items, outputPath) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50 });
        doc.pipe(fs.createWriteStream(outputPath));

        // Header with Invoice title
        doc.fontSize(24)
           .fillColor('#dc2626')
           .text('INVOICE', 50, 50, { align: 'center' })
           .fillColor('black')
           .moveDown();

        // Company Info
        doc.fontSize(12)
           .text('Your Company Name', 50, 100)
           .text('Your Company Address', 50, 115)
           .text('GST No: YOUR_GST_NUMBER', 50, 130)
           .text('Email: your-email@company.com', 50, 145)
           .text('Phone: +91-XXXXXXXXXX', 50, 160);

        // Invoice Details Box
        doc.rect(350, 100, 200, 80).stroke();
        doc.fontSize(12)
           .text('Invoice Details', 360, 110)
           .fontSize(10)
           .text(`Invoice No: INV-${order.orderNumber}`, 360, 130)
           .text(`Date: ${new Date().toLocaleDateString('en-IN')}`, 360, 145)
           .text(`Order No: ${order.orderNumber}`, 360, 160);

        // Bill To Section
        const billToTop = 200;
        doc.rect(50, billToTop, 200, 100).stroke();
        doc.fontSize(12)
           .fillColor('#007bff')
           .text('Bill To:', 60, billToTop + 10)
           .fillColor('black')
           .fontSize(10)
           .text(`${order.billingAddress.firstName} ${order.billingAddress.lastName}`, 60, billToTop + 30)
           .text(`${order.billingAddress.address}`, 60, billToTop + 45);

        if (order.billingAddress.apartment) {
          doc.text(`${order.billingAddress.apartment}`, 60, billToTop + 60);
        }

        doc.text(`${order.billingAddress.city}, ${order.billingAddress.province}`, 60, billToTop + 75)
           .text(`${order.billingAddress.postalCode}, ${order.billingAddress.country}`, 60, billToTop + 90);

        // Items Table
        const tableTop = billToTop + 120;
        
        // Table Header
        doc.rect(50, tableTop, 500, 25).fill('#f8f9fa').stroke();
        doc.fillColor('black')
           .fontSize(10)
           .text('Description', 60, tableTop + 8)
           .text('Qty', 250, tableTop + 8)
           .text('Rate', 320, tableTop + 8)
           .text('Amount', 450, tableTop + 8);

        // Items
        let yPosition = tableTop + 35;
        items.forEach((item, index) => {
          const isEven = index % 2 === 0;
          if (isEven) {
            doc.rect(50, yPosition - 5, 500, 25).fill('#f9fafb').stroke();
            doc.fillColor('black');
          }

          doc.text(item.name.substring(0, 30) + (item.name.length > 30 ? '...' : ''), 60, yPosition)
             .text(item.quantity.toString(), 250, yPosition)
             .text(`₹${item.price.toFixed(2)}`, 320, yPosition)
             .text(`₹${(item.price * item.quantity).toFixed(2)}`, 450, yPosition);
          
          yPosition += 25;
        });

        // Totals Section
        const totalsTop = yPosition + 20;
        doc.fontSize(10);

        // Subtotal
        doc.text('Subtotal:', 400, totalsTop)
           .text(`₹${order.orderSummary.subtotal.toFixed(2)}`, 480, totalsTop);

        // Tax
        doc.text('GST (18%):', 400, totalsTop + 15)
           .text(`₹${order.orderSummary.tax.toFixed(2)}`, 480, totalsTop + 15);

        // Shipping
        doc.text('Shipping:', 400, totalsTop + 30)
           .text(`₹${order.orderSummary.shipping.toFixed(2)}`, 480, totalsTop + 30);

        // Discount
        if (order.orderSummary.discount > 0) {
          doc.fillColor('green')
             .text('Discount:', 400, totalsTop + 45)
             .text(`-₹${order.orderSummary.discount.toFixed(2)}`, 480, totalsTop + 45)
             .fillColor('black');
        }

        // Total
        const totalTop = order.orderSummary.discount > 0 ? totalsTop + 65 : totalsTop + 50;
        doc.rect(380, totalTop - 5, 170, 25).fill('#007bff').stroke();
        doc.fillColor('white')
           .fontSize(12)
           .text('Total Amount:', 390, totalTop + 3)
           .text(`₹${order.orderSummary.total.toFixed(2)}`, 480, totalTop + 3)
           .fillColor('black');

        // Payment Info
        const paymentTop = totalTop + 40;
        doc.fontSize(10)
           .text(`Payment Method: ${order.paymentMethod.toUpperCase()}`, 50, paymentTop)
           .text(`Payment Status: ${order.paymentStatus.toUpperCase()}`, 50, paymentTop + 15);

        if (order.stripePaymentId) {
          doc.text(`Payment ID: ${order.stripePaymentId}`, 50, paymentTop + 30);
        }

        // Footer
        const footerTop = paymentTop + 60;
        doc.fontSize(10)
           .fillColor('gray')
           .text('Terms & Conditions:', 50, footerTop)
           .fontSize(8)
           .text('1. This is a computer generated invoice.', 50, footerTop + 15)
           .text('2. Please retain this invoice for your records.', 50, footerTop + 25)
           .text('3. For any queries, please contact us at the above details.', 50, footerTop + 35)
           .text(`Generated on: ${new Date().toLocaleString('en-IN')}`, 50, footerTop + 50);

        doc.end();

        doc.on('end', () => {
          resolve(outputPath);
        });

      } catch (error) {
        reject(error);
      }
    });
  }

  // Generate Bill PDF (for COD orders)
  static async generateBillPDF(order, items, outputPath) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50 });
        doc.pipe(fs.createWriteStream(outputPath));

        // Header
        doc.fontSize(20)
           .fillColor('#f59e0b')
           .text('BILL / ORDER RECEIPT', 50, 50, { align: 'center' })
           .fillColor('black')
           .moveDown();

        // Company Info
        doc.fontSize(12)
           .text('Your Company Name', 50, 100)
           .text('Your Company Address', 50, 115)
           .text('Email: your-email@company.com', 50, 130)
           .text('Phone: +91-XXXXXXXXXX', 50, 145);

        // Bill Details
        doc.rect(350, 100, 200, 80).stroke();
        doc.fontSize(12)
           .text('Bill Details', 360, 110)
           .fontSize(10)
           .text(`Bill No: BILL-${order.orderNumber}`, 360, 130)
           .text(`Date: ${new Date(order.createdAt).toLocaleDateString('en-IN')}`, 360, 145)
           .text(`Order No: ${order.orderNumber}`, 360, 160);

        // Customer Info
        const customerTop = 200;
        doc.rect(50, customerTop, 200, 100).stroke();
        doc.fontSize(12)
           .fillColor('#f59e0b')
           .text('Customer Details:', 60, customerTop + 10)
           .fillColor('black')
           .fontSize(10)
           .text(`${order.billingAddress.firstName} ${order.billingAddress.lastName}`, 60, customerTop + 30)
           .text(`${order.billingAddress.address}`, 60, customerTop + 45);

        if (order.billingAddress.apartment) {
          doc.text(`${order.billingAddress.apartment}`, 60, customerTop + 60);
        }

        doc.text(`${order.billingAddress.city}, ${order.billingAddress.province}`, 60, customerTop + 75)
           .text(`${order.billingAddress.postalCode}`, 60, customerTop + 90);

        // Items Table
        const tableTop = customerTop + 120;
        
        // Table Header
        doc.rect(50, tableTop, 500, 25).fill('#fef3c7').stroke();
        doc.fillColor('black')
           .fontSize(10)
           .text('Item', 60, tableTop + 8)
           .text('Qty', 250, tableTop + 8)
           .text('Price', 320, tableTop + 8)
           .text('Total', 450, tableTop + 8);

        // Items
        let yPosition = tableTop + 35;
        items.forEach((item, index) => {
          doc.text(item.name.substring(0, 30) + (item.name.length > 30 ? '...' : ''), 60, yPosition)
             .text(item.quantity.toString(), 250, yPosition)
             .text(`₹${item.price.toFixed(2)}`, 320, yPosition)
             .text(`₹${(item.price * item.quantity).toFixed(2)}`, 450, yPosition);
          
          yPosition += 20;
        });

        // Totals
        const totalsTop = yPosition + 30;
        doc.rect(350, totalsTop, 200, 80).stroke();
        
        doc.fontSize(10)
           .text(`Subtotal: ₹${order.orderSummary.subtotal.toFixed(2)}`, 360, totalsTop + 10)
           .text(`Tax: ₹${order.orderSummary.tax.toFixed(2)}`, 360, totalsTop + 25)
           .text(`Shipping: ₹${order.orderSummary.shipping.toFixed(2)}`, 360, totalsTop + 40);

        if (order.orderSummary.discount > 0) {
          doc.fillColor('green')
             .text(`Discount: -₹${order.orderSummary.discount.toFixed(2)}`, 360, totalsTop + 55)
             .fillColor('black');
        }

        doc.fontSize(12)
           .fillColor('#f59e0b')
           .text(`Total: ₹${order.orderSummary.total.toFixed(2)}`, 360, totalsTop + 70)
           .fillColor('black');

        // Payment Info
        const paymentTop = totalsTop + 100;
        doc.fontSize(12)
           .fillColor('#dc2626')
           .text('CASH ON DELIVERY', 50, paymentTop, { align: 'center' })
           .fillColor('black')
           .fontSize(10)
           .text('Payment will be collected upon delivery', 50, paymentTop + 20, { align: 'center' });

        // Footer
        const footerTop = paymentTop + 50;
        doc.fontSize(10)
           .fillColor('gray')
           .text('Please keep this bill for delivery reference.', 50, footerTop, { align: 'center' })
           .text('Thank you for your order!', 50, footerTop + 15, { align: 'center' });

        doc.end();

        doc.on('end', () => {
          resolve(outputPath);
        });

      } catch (error) {
        reject(error);
      }
    });
  }
}

module.exports = PDFGeneratorService;