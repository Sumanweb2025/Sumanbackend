// Utils/invoice.js
const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

function currency(n) {
  return `$${(parseFloat(n) || 0).toFixed(2)} CAD`;
}

exports.generateInvoicePDF = async (order) => {
  const invoicesDir = path.join(process.cwd(), 'invoices');
  if (!fs.existsSync(invoicesDir)) fs.mkdirSync(invoicesDir, { recursive: true });

  const filePath = path.join(invoicesDir, `Invoice-${order.orderNumber}.pdf`);
  const doc = new PDFDocument({ margin: 50 });

  const stream = fs.createWriteStream(filePath);
  doc.pipe(stream);

  // Header
  doc
    .fontSize(20).text('INVOICE', { align: 'right' })
    .moveDown()
    .fontSize(12).text('Your Brand Ltd.', { continued: true }).text(' ')
    .text('123, Street, City, ON, Canada')
    .text('support@yourbrand.com')
    .text('GST/HST: 123456789')
    .moveDown();

  // Bill To & Meta
  doc
    .fontSize(12)
    .text(`Invoice #: ${order.orderNumber}`)
    .text(`Date: ${new Date(order.createdAt || Date.now()).toLocaleDateString()}`)
    .moveDown()
    .text('Bill To:', { underline: true })
    .text(`${order.billingAddress.firstName} ${order.billingAddress.lastName}`)
    .text(order.billingAddress.address + (order.billingAddress.apartment ? `, ${order.billingAddress.apartment}` : ''))
    .text(`${order.billingAddress.city}, ${order.billingAddress.province} ${order.billingAddress.postalCode}`)
    .text(order.billingAddress.country)
    .moveDown();

  // Items table header
  doc.fontSize(12).text('Items', { underline: true }).moveDown(0.5);

  const tableTop = doc.y;
  const colX = [50, 280, 360, 430, 500]; // Name, Brand, Qty, Price, Total

  doc.text('Product', colX[0], tableTop)
     .text('Brand', colX[1], tableTop)
     .text('Qty', colX[2], tableTop)
     .text('Price', colX[3], tableTop)
     .text('Line Total', colX[4], tableTop);

  doc.moveTo(50, tableTop + 15).lineTo(560, tableTop + 15).stroke();

  let y = tableTop + 25;
  order.items.forEach(it => {
    doc.text(it.name, colX[0], y, { width: 210 })
       .text(it.brand || '-', colX[1], y)
       .text(String(it.quantity), colX[2], y, { width: 40, align: 'right' })
       .text(currency(it.price), colX[3], y, { width: 60, align: 'right' })
       .text(currency(it.price * it.quantity), colX[4], y, { width: 70, align: 'right' });
    y += 18;
  });

  // Totals
  doc.moveDown().moveTo(350, y + 10).lineTo(560, y + 10).stroke();
  y += 20;

  const { subtotal, tax, shipping, discount, total } = order.orderSummary;
  const right = (label, amount) => {
    doc.text(label, 360, y, { width: 140, align: 'right' })
       .text(currency(amount), 500, y, { width: 70, align: 'right' });
    y += 16;
  };

  right('Subtotal', subtotal);
  right('Tax (HST 13%)', tax);
  right('Shipping', shipping);
  if (discount && discount > 0) right('Discount', -Math.abs(discount));
  doc.font('Helvetica-Bold');
  right('Total', total);
  doc.font('Helvetica');

  doc.moveDown(2).text(`Payment Method: ${order.paymentMethod.toUpperCase()} | Status: ${order.paymentStatus.toUpperCase()}`);
  doc.moveDown().fontSize(10).text('Thank you for your order!', { align: 'center' });

  doc.end();

  await new Promise(res => stream.on('finish', res));

  return filePath;
};
