const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const QRCode = require('qrcode');

class PDFGeneratorService {
   // Add logo to PDF with increased size
   static addLogo(doc, x, y, size = 150) {
      try {
         const logoPath = path.join(__dirname, '../public/logo-title.png');
         if (fs.existsSync(logoPath)) {
            doc.image(logoPath, x, y, { width: size });
         } else {
            // Fallback: Create circular logo with 'L'
            doc.circle(x + size / 2, y + size / 2, size / 2)
               .fillColor('#000000')
               .fill()
               .fillColor('white')
               .fontSize(size / 2)
               .text('L', x + size / 3, y + size / 3)
               .fillColor('black');
         }
      } catch (error) {
         // Fallback logo in black and white
         doc.circle(x + size / 2, y + size / 2, size / 2)
            .fillColor('#000000')
            .fill()
            .fillColor('white')
            .fontSize(size / 2)
            .text('L', x + size / 3, y + size / 3)
            .fillColor('black');
      }
   }

   // Generate QR Code for invoice download URL in black and white
   static async generateDownloadQRCode(order) {
      const downloadUrl = `http://localhost:8000/api/invoices/download-invoice/${order.orderNumber}`;
      return await QRCode.toBuffer(downloadUrl, {
         width: 100,
         margin: 1,
         color: {
            dark: '#000000',
            light: '#FFFFFF'
         }
      });
   }

   // Generate Order Confirmation PDF Buffer (Black & White with Borders)
   static async generateOrderConfirmationPDFBuffer(order, items) {
      return new Promise((resolve, reject) => {
         try {
            const doc = new PDFDocument({ margin: 50 });
            const chunks = [];

            doc.on('data', chunk => chunks.push(chunk));
            doc.on('end', () => {
               const buffer = Buffer.concat(chunks);
               resolve(buffer);
            });
            doc.on('error', reject);

            // Page border (like MS Word)
            doc.rect(40, 40, doc.page.width - 80, doc.page.height - 80)
               .strokeColor('#999999')
               .lineWidth(2)
               .stroke();

            // Logo and title
            this.addLogo(doc, 60, 60, 100);
            doc.fontSize(20)
               .fillColor('#000000')
               .font('Helvetica-Bold')
               .text('Order Confirmation', 175, 75)
               .fillColor('black')
               .font('Helvetica');

            // Order Details section
            doc.fontSize(14)
               .fillColor('#000000')
               .font('Helvetica-Bold')
               .text('Order Details:', 60, 150)
               .fillColor('black')
               .font('Helvetica');

            // From section (right aligned)
            doc.fontSize(10)
               .text('From:', 380, 150)
               .text('Iyappaa Sweets & Snacks Inc', 380, 165)
               .text('Contact No:+1 416 562 6363', 380, 180)
               .text('Email: sellappan@gmail.com', 380, 195)
               .text('Website: www.iyappaa.com', 380, 210);

            // To section (left aligned)
            doc.text('To:', 60, 180)
               .text(`Name: ${order.billingAddress.firstName} ${order.billingAddress.lastName}`, 60, 195)
               .text(`Contact No: ${order.billingAddress.phone || 'N/A'}`, 60, 210)
               .text(`Email: ${order.email || 'N/A'}`, 60, 225)
               .text(`Address: ${order.billingAddress.address}, ${order.billingAddress.city}, ${order.billingAddress.province} ${order.billingAddress.postalCode}`, 60, 240, { width: 300 });

            // Items table with borders
            const tableTop = 280;
            const tableLeft = 60;
            const tableWidth = 485;

            // Column widths
            const col1 = 40;  // S.No
            const col2 = 185; // Item
            const col3 = 60;  // Qty
            const col4 = 70;  // Unit Price
            const col5 = 70;  // Discount
            const col6 = 60;  // Total Price

            // Table header with black background
            doc.rect(tableLeft, tableTop, tableWidth, 30)
               .fillAndStroke('#999999', '#999999');

            doc.fillColor('white')
               .fontSize(11)
               .font('Helvetica-Bold')
               .text('S.No', tableLeft + 5, tableTop + 10, { width: col1 - 10 })
               .text('Item', tableLeft + col1 + 5, tableTop + 10, { width: col2 - 10 })
               .text('Qty', tableLeft + col1 + col2 + 5, tableTop + 10, { width: col3 - 10 })
               .text('Unit Price', tableLeft + col1 + col2 + col3 + 5, tableTop + 10, { width: col4 - 10 })
               .text('Discount', tableLeft + col1 + col2 + col3 + col4 + 5, tableTop + 10, { width: col5 - 10 })
               .text('Total', tableLeft + col1 + col2 + col3 + col4 + col5 + 5, tableTop + 10, { width: col6 - 10 });

            // Table rows with borders
            let yPosition = tableTop + 30;

            items.forEach((item, index) => {
               const rowHeight = 50;

               // Row border and background
               doc.rect(tableLeft, yPosition, tableWidth, rowHeight)
                  .strokeColor('#999999')
                  .lineWidth(1)
                  .stroke();

               // Vertical lines for columns
               doc.moveTo(tableLeft + col1, yPosition)
                  .lineTo(tableLeft + col1, yPosition + rowHeight)
                  .stroke();
               doc.moveTo(tableLeft + col1 + col2, yPosition)
                  .lineTo(tableLeft + col1 + col2, yPosition + rowHeight)
                  .stroke();
               doc.moveTo(tableLeft + col1 + col2 + col3, yPosition)
                  .lineTo(tableLeft + col1 + col2 + col3, yPosition + rowHeight)
                  .stroke();
               doc.moveTo(tableLeft + col1 + col2 + col3 + col4, yPosition)
                  .lineTo(tableLeft + col1 + col2 + col3 + col4, yPosition + rowHeight)
                  .stroke();
               doc.moveTo(tableLeft + col1 + col2 + col3 + col4 + col5, yPosition)
                  .lineTo(tableLeft + col1 + col2 + col3 + col4 + col5, yPosition + rowHeight)
                  .stroke();

               const discount = item.discount || 0;

               // S.No
               doc.fillColor('black')
                  .fontSize(10)
                  .font('Helvetica')
                  .text((index + 1).toString(), tableLeft + 12, yPosition + 20, { width: col1 - 10 });

               // Item name and description
               const itemName = item.name.length > 22 ? item.name.substring(0, 19) + '...' : item.name;
               doc.fontSize(10)
                  .font('Helvetica-Bold')
                  .text(itemName, tableLeft + col1 + 5, yPosition + 10, { width: col2 - 10 });

               const description = item.description || `${item.name} details`;
               const shortDescription = description.length > 28 ? description.substring(0, 25) + '...' : description;
               doc.fontSize(8)
                  .fillColor('#333333')
                  .font('Helvetica')
                  .text(shortDescription, tableLeft + col1 + 5, yPosition + 28, { width: col2 - 10 });

               // Other columns
               doc.fillColor('black')
                  .fontSize(10)
                  .font('Helvetica')
                  .text(item.quantity.toString(), tableLeft + col1 + col2 + 5, yPosition + 20, { width: col3 - 10 })
                  .text(`$${item.price.toFixed(2)}`, tableLeft + col1 + col2 + col3 + 5, yPosition + 20, { width: col4 - 10 })
                  .text(`$${discount.toFixed(2)}`, tableLeft + col1 + col2 + col3 + col4 + 5, yPosition + 20, { width: col5 - 10 })
                  .text(`$${((item.price * item.quantity) - discount).toFixed(2)}`, tableLeft + col1 + col2 + col3 + col4 + col5 + 5, yPosition + 20, { width: col6 - 10 });

               yPosition += rowHeight;
            });

            // Summary section
            const summaryTop = yPosition + 30;

            doc.fontSize(10)
               .text('Sub Total', 400, summaryTop)
               .text(`$${order.orderSummary.subtotal.toFixed(2)}`, 480, summaryTop);

            doc.text('Tax 13%', 400, summaryTop + 20)
               .text(`$${order.orderSummary.tax.toFixed(2)}`, 480, summaryTop + 20);

            // Grand Total with black background
            doc.rect(370, summaryTop + 40, 175, 30)
               .fillAndStroke('#999999', '#999999');

            doc.fillColor('white')
               .fontSize(12)
               .font('Helvetica-Bold')
               .text('Grand Total', 380, summaryTop + 50)
               .text(`$${order.orderSummary.total.toFixed(2)}`, 480, summaryTop + 50);

            // Note section
            const noteTop = summaryTop + 90;
            doc.fillColor('black')
               .fontSize(10)
               .font('Helvetica-Bold')
               .text('Note:', 60, noteTop)
               .fontSize(9)
               .font('Helvetica')
               .text(`Should you have any enquiries concerning this confirmation, please contact us.`, 60, noteTop + 15, { width: 500 })
               .text('Thanks for your Business!', 60, noteTop + 35);

            doc.end();

         } catch (error) {
            reject(error);
         }
      });
   }

   // Generate Invoice PDF Buffer (Black & White with Borders)
   static async generateInvoicePDFBuffer(order, items) {
      return new Promise(async (resolve, reject) => {
         try {
            const doc = new PDFDocument({ margin: 40, size: 'A4' });
            const chunks = [];

            doc.on('data', chunk => chunks.push(chunk));
            doc.on('end', () => {
               const buffer = Buffer.concat(chunks);
               resolve(buffer);
            });
            doc.on('error', reject);

            // Page border
            doc.rect(30, 30, doc.page.width - 60, doc.page.height - 60)
               .strokeColor('#999999')
               .lineWidth(2)
               .stroke();

            // Generate QR Code
            const qrCodeBuffer = await this.generateDownloadQRCode(order);

            // Logo
            this.addLogo(doc, 50, 50, 150);

            // Company details
            const companyName = order.companyName || 'Iyappaa Sweets & Snacks Inc';
            const companyAddress = order.companyAddress || {
               street: '2721 Markham Road, Unit #18',
               area: 'Scarborough',
               city: 'Toronto - M1X 1L5',
               country: 'Canada'
            };

            doc.fontSize(16)
               .fillColor('#000000')
               .font('Helvetica-Bold')
               .text(companyName, 300, 50, { align: 'right', width: 250 })
               .fillColor('#333333')
               .fontSize(9)
               .font('Helvetica')
               .text(companyAddress.street, 300, 70, { align: 'right', width: 215 })
               .text(companyAddress.area, 300, 83, { align: 'right', width: 215 })
               .text(companyAddress.city, 300, 96, { align: 'right', width: 215 })
               .text(companyAddress.country, 300, 109, { align: 'right', width: 215 });

            // Horizontal line
            doc.moveTo(50, 140)
               .lineTo(545, 140)
               .strokeColor('#999999')
               .lineWidth(1)
               .stroke();

            // INVOICE title
            doc.fontSize(22)
               .fillColor('#000000')
               .font('Helvetica-Bold')
               .text('INVOICE', 50, 155, { align: 'center', width: 495 });

            // Bill To section
            doc.fontSize(11)
               .font('Helvetica-Bold')
               .text('Bill To', 50, 195)
               .fontSize(10)
               .font('Helvetica')
               .text(`${order.billingAddress.firstName} ${order.billingAddress.lastName}`, 50, 210)
               .fontSize(9)
               .text(`${order.billingAddress.address}`, 50, 225)
               .text(`${order.billingAddress.city}`, 50, 238)
               .text(`${order.billingAddress.province} ${order.billingAddress.postalCode}`, 50, 251);

            // Ship To section
            doc.fontSize(11)
               .font('Helvetica-Bold')
               .text('Ship To', 50, 275)
               .fontSize(9)
               .font('Helvetica')
               .text(`${order.shippingAddress?.address || order.billingAddress.address}`, 50, 290)
               .text(`${order.shippingAddress?.city || order.billingAddress.city}`, 50, 303)
               .text(`${order.shippingAddress?.province || order.billingAddress.province} ${order.shippingAddress?.postalCode || order.billingAddress.postalCode}`, 50, 316);

            // Invoice details table
            const detailsX = 345;
            const detailsY = 195;
            const cellWidth = 105;
            const cellHeight = 28;

            const createDetailRow = (label, value, rowIndex) => {
               const yPos = detailsY + (rowIndex * cellHeight);

               // Label cell
               doc.rect(detailsX, yPos, cellWidth, cellHeight)
                  .fillAndStroke('#999999', '#999999');
               doc.rect(detailsX + cellWidth, yPos, cellWidth, cellHeight)
                  .strokeColor('#999999')
                  .stroke();

               doc.fillColor('white')
                  .fontSize(9)
                  .font('Helvetica-Bold')
                  .text(label, detailsX + 6, yPos + 7);
               doc.fillColor('black')
                  .font('Helvetica')
                  .text(value, detailsX + cellWidth + 6, yPos + 7);
            };

            createDetailRow('Invoice#', `INV-${order.orderNumber}`, 0);
            createDetailRow('Invoice Date', new Date(order.createdAt).toLocaleDateString('en-CA'), 1);
            createDetailRow('Terms', 'Due on Receipt', 2);
            createDetailRow('Due Date', new Date(order.createdAt).toLocaleDateString('en-CA'), 3);

            // Items table with borders
            const tableTop = 350;
            const tableLeft = 50;
            const tableWidth = 495;

            // Table header
            doc.rect(tableLeft, tableTop, tableWidth, 30)
               .fillAndStroke('#999999', '#999999');

            doc.fillColor('white')
               .fontSize(10)
               .font('Helvetica-Bold')
               .text('#', tableLeft + 10, tableTop + 12, { width: 20 })
               .text('Item & Description', tableLeft + 40, tableTop + 12, { width: 200 })
               .text('Qty', tableLeft + 250, tableTop + 12, { width: 40 })
               .text('Rate', tableLeft + 300, tableTop + 12, { width: 50 })
               .text('Discount', tableLeft + 360, tableTop + 12, { width: 60 })
               .text('Amount', tableLeft + 430, tableTop + 12, { width: 55 });

            // Table rows
            let yPos = tableTop + 30;
            const rowHeight = 60;

            items.forEach((item, index) => {
               // Row border
               doc.rect(tableLeft, yPos, tableWidth, rowHeight)
                  .strokeColor('#999999')
                  .lineWidth(1)
                  .stroke();

               // Vertical lines
               doc.moveTo(tableLeft + 30, yPos).lineTo(tableLeft + 30, yPos + rowHeight).stroke();
               doc.moveTo(tableLeft + 240, yPos).lineTo(tableLeft + 240, yPos + rowHeight).stroke();
               doc.moveTo(tableLeft + 290, yPos).lineTo(tableLeft + 290, yPos + rowHeight).stroke();
               doc.moveTo(tableLeft + 350, yPos).lineTo(tableLeft + 350, yPos + rowHeight).stroke();
               doc.moveTo(tableLeft + 420, yPos).lineTo(tableLeft + 420, yPos + rowHeight).stroke();

               doc.fillColor('black')
                  .fontSize(9)
                  .font('Helvetica')
                  .text((index + 1).toString(), tableLeft + 10, yPos + 25);

               const itemName = item.name.length > 25 ? item.name.substring(0, 22) + '...' : item.name;
               doc.fontSize(10)
                  .font('Helvetica-Bold')
                  .text(itemName, tableLeft + 40, yPos + 15, { width: 190 });

               const description = item.description || `${item.name} - Product details`;
               const shortDescription = description.length > 40 ? description.substring(0, 37) + '...' : description;
               doc.fontSize(8)
                  .fillColor('#333333')
                  .font('Helvetica')
                  .text(shortDescription, tableLeft + 40, yPos + 32, { width: 190 });

               const discount = item.discount || 0;
               doc.fillColor('black')
                  .fontSize(9)
                  .font('Helvetica')
                  .text(item.quantity.toString(), tableLeft + 255, yPos + 25)
                  .text(`$${item.price.toFixed(2)}`, tableLeft + 305, yPos + 25)
                  .text(`$${discount.toFixed(2)}`, tableLeft + 365, yPos + 25)
                  .text(`$${((item.price * item.quantity) - discount).toFixed(2)}`, tableLeft + 430, yPos + 25);

               yPos += rowHeight;
            });

            // Summary section
            const summaryTop = yPos + 30;
            const summaryX = 350;

            doc.fontSize(10)
               .text('Thanks for your business.', 50, summaryTop);

            doc.text('Sub Total', summaryX, summaryTop)
               .text(`$${order.orderSummary.subtotal.toFixed(2)}`, summaryX + 110, summaryTop);

            const taxRate = order.orderSummary.taxRate || 13.00;
            doc.text(`Tax ${taxRate}%`, summaryX, summaryTop + 20)
               .text(`$${order.orderSummary.tax.toFixed(2)}`, summaryX + 110, summaryTop + 20);

            doc.moveTo(summaryX, summaryTop + 40)
               .lineTo(summaryX + 145, summaryTop + 40)
               .strokeColor('#000000')
               .stroke();

            doc.fontSize(12)
               .font('Helvetica-Bold')
               .text('Total', summaryX, summaryTop + 50)
               .text(`$${order.orderSummary.total.toFixed(2)}`, summaryX + 110, summaryTop + 50);

            // Balance Due
            doc.rect(summaryX, summaryTop + 70, 145, 25)
               .fillAndStroke('#999999', '#999999');
            doc.fillColor('white')
               .fontSize(11)
               .text('Balance Due', summaryX + 10, summaryTop + 78)
               .text(`$${order.orderSummary.total.toFixed(2)}`, summaryX + 80, summaryTop + 78);

            // QR Code and Terms
            const bottomY = summaryTop + 120;

            if (qrCodeBuffer) {
               doc.image(qrCodeBuffer, 50, bottomY, { width: 80 });
               doc.fontSize(8)
                  .fillColor('#333333')
                  .font('Helvetica')
                  .text('Scan to download', 50, bottomY + 85, { width: 80, align: 'center' });
            }

            const termsX = 150;
            doc.fillColor('#000000')
               .fontSize(11)
               .font('Helvetica-Bold')
               .text('Terms & Conditions', termsX, bottomY)
               .fontSize(9)
               .font('Helvetica')
               .text('1. Payment is due within 30 days of invoice date.', termsX, bottomY + 20, { width: 300 })
               .text('2. Late payments may incur additional charges.', termsX, bottomY + 35, { width: 300 })
               .text('3. Goods remain property of seller until payment.', termsX, bottomY + 50, { width: 300 });

            doc.end();

         } catch (error) {
            reject(error);
         }
      });
   }

   // Generate Bill PDF Buffer (Black & White with Borders)
   static async generateBillPDFBuffer(order, items) {
      return new Promise(async (resolve, reject) => {
         try {
            const doc = new PDFDocument({ margin: 50, size: 'A4' });
            const chunks = [];

            doc.on('data', chunk => chunks.push(chunk));
            doc.on('end', () => {
               const buffer = Buffer.concat(chunks);
               resolve(buffer);
            });
            doc.on('error', reject);

            // Page border
            doc.rect(30, 30, doc.page.width - 60, doc.page.height - 60)
               .strokeColor('#999999')
               .lineWidth(2)
               .stroke();

            // Generate QR Code
            const qrCodeBuffer = await this.generateDownloadQRCode(order);

            // Logo
            this.addLogo(doc, 50, 50, 150);

            // Company details
            const companyName = order.companyName || 'Iyappaa Sweets & Snacks Inc';
            const companyAddress = order.companyAddress || {
               street: '2721 Markham Road, Unit #18',
               area: 'Scarborough',
               city: 'Toronto - M1X 1L5',
               country: 'Canada'
            };

            const pageWidth = 595;
            const rightMargin = 50;
            const companyDetailsWidth = 250;
            const companyX = pageWidth - rightMargin - companyDetailsWidth;

            doc.fontSize(16)
               .fillColor('#000000')
               .font('Helvetica-Bold')
               .text(companyName, companyX, 50, { align: 'right', width: companyDetailsWidth })
               .fillColor('#333333')
               .fontSize(9)
               .font('Helvetica')
               .text(companyAddress.street, companyX, 70, { align: 'right', width: companyDetailsWidth })
               .text(companyAddress.area, companyX, 83, { align: 'right', width: companyDetailsWidth })
               .text(companyAddress.city, companyX, 96, { align: 'right', width: companyDetailsWidth })
               .text(companyAddress.country, companyX, 109, { align: 'right', width: companyDetailsWidth });

            // Horizontal line
            doc.moveTo(50, 140)
               .lineTo(545, 140)
               .strokeColor('#999999')
               .lineWidth(1)
               .stroke();

            // BILL INVOICE title
            doc.fontSize(22)
               .fillColor('#000000')
               .font('Helvetica-Bold')
               .text('BILL INVOICE', 50, 155, { align: 'center', width: 495 });

            // Bill To section
            const leftColumnX = 50;
            const billToY = 190;

            doc.fontSize(12)
               .font('Helvetica-Bold')
               .text('Bill To', leftColumnX, billToY)
               .fontSize(11)
               .text(`${order.billingAddress.firstName} ${order.billingAddress.lastName}`, leftColumnX, billToY + 18)
               .fontSize(10)
               .font('Helvetica')
               .text(`${order.billingAddress.address}`, leftColumnX, billToY + 35)
               .text(`${order.billingAddress.city}`, leftColumnX, billToY + 50)
               .text(`${order.billingAddress.province} ${order.billingAddress.postalCode}`, leftColumnX, billToY + 65);

            // Ship To section
            const shipToY = billToY + 95;

            doc.fontSize(12)
               .font('Helvetica-Bold')
               .text('Ship To', leftColumnX, shipToY)
               .fontSize(10)
               .font('Helvetica')
               .text(`${order.shippingAddress?.address || order.billingAddress.address}`, leftColumnX, shipToY + 18)
               .text(`${order.shippingAddress?.city || order.billingAddress.city}`, leftColumnX, shipToY + 33)
               .text(`${order.shippingAddress?.province || order.billingAddress.province} ${order.shippingAddress?.postalCode || order.billingAddress.postalCode}`, leftColumnX, shipToY + 48);

            // Bill details table
            const detailsX = 320;
            const detailsY = 190;
            const labelCellWidth = 80;
            const valueCellWidth = 140;
            const cellHeight = 28;

            const createDetailRow = (label, value, rowIndex) => {
               const yPos = detailsY + (rowIndex * cellHeight);

               doc.rect(detailsX, yPos, labelCellWidth, cellHeight)
                  .fillAndStroke('#999999', '#999999');

               doc.rect(detailsX + labelCellWidth, yPos, valueCellWidth, cellHeight)
                  .strokeColor('#999999')
                  .lineWidth(1)
                  .stroke();

               doc.fillColor('white')
                  .fontSize(10)
                  .font('Helvetica-Bold')
                  .text(label, detailsX + 8, yPos + 8);

               doc.fillColor('#000000')
                  .fontSize(9)
                  .font('Helvetica')
                  .text(value, detailsX + labelCellWidth + 8, yPos + 8);
            };

            createDetailRow('Bill#', `BILL-${order.orderNumber}`, 0);
            createDetailRow('Bill Date', new Date(order.createdAt).toLocaleDateString('en-CA'), 1);
            createDetailRow('Terms', 'Cash on Delivery', 2);
            createDetailRow('Due Date', 'On Delivery', 3);

            // Items table with borders
            const tableTop = 370;
            const tableLeft = 50;
            const tableWidth = 495;
            const headerHeight = 35;

            // Table header
            doc.rect(tableLeft, tableTop, tableWidth, headerHeight)
               .fillAndStroke('#999999', '#999999');

            doc.fillColor('white')
               .fontSize(11)
               .font('Helvetica-Bold')
               .text('#', tableLeft + 10, tableTop + 12, { width: 20 })
               .text('Item & Description', tableLeft + 45, tableTop + 12, { width: 180 })
               .text('Qty', tableLeft + 240, tableTop + 12, { width: 40 })
               .text('Rate', tableLeft + 290, tableTop + 12, { width: 50 })
               .text('Discount', tableLeft + 350, tableTop + 12, { width: 60 })
               .text('Amount', tableLeft + 425, tableTop + 12, { width: 60 });

            // Table rows
            let yPos = tableTop + headerHeight;
            const rowHeight = 65;

            items.forEach((item, index) => {
               // Row border
               doc.rect(tableLeft, yPos, tableWidth, rowHeight)
                  .strokeColor('#999999')
                  .lineWidth(1)
                  .stroke();

               // Vertical lines
               doc.moveTo(tableLeft + 35, yPos).lineTo(tableLeft + 35, yPos + rowHeight).stroke();
               doc.moveTo(tableLeft + 230, yPos).lineTo(tableLeft + 230, yPos + rowHeight).stroke();
               doc.moveTo(tableLeft + 280, yPos).lineTo(tableLeft + 280, yPos + rowHeight).stroke();
               doc.moveTo(tableLeft + 340, yPos).lineTo(tableLeft + 340, yPos + rowHeight).stroke();
               doc.moveTo(tableLeft + 415, yPos).lineTo(tableLeft + 415, yPos + rowHeight).stroke();

               doc.fillColor('#000000')
                  .fontSize(10)
                  .font('Helvetica')
                  .text((index + 1).toString(), tableLeft + 12, yPos + 28);

               const itemName = item.name.length > 30 ? item.name.substring(0, 27) + '...' : item.name;
               doc.fontSize(11)
                  .font('Helvetica-Bold')
                  .text(itemName, tableLeft + 45, yPos + 18, { width: 180 });

               const description = item.description || `${item.name} - Product details`;
               const shortDescription = description.length > 45 ? description.substring(0, 42) + '...' : description;
               doc.fontSize(9)
                  .fillColor('#333333')
                  .font('Helvetica')
                  .text(shortDescription, tableLeft + 45, yPos + 35, { width: 180 });

               doc.fillColor('#000000')
                  .fontSize(10)
                  .font('Helvetica')
                  .text(item.quantity.toString(), tableLeft + 245, yPos + 28);

               doc.text(`$${item.price.toFixed(2)}`, tableLeft + 295, yPos + 28);

               const discount = item.discount || 0;
               doc.text(`$${discount.toFixed(2)}`, tableLeft + 355, yPos + 28);

               doc.text(`$${((item.price * item.quantity) - discount).toFixed(2)}`, tableLeft + 430, yPos + 28);

               yPos += rowHeight;
            });

            // Summary section
            const summaryTop = yPos + 30;
            const summaryX = 320;
            const summaryLabelWidth = 100;
            const summaryValueWidth = 100;

            doc.fontSize(11)
               .fillColor('#000000')
               .font('Helvetica-Oblique')
               .text('Thanks for your business.', 50, summaryTop + 10);

            const createSummaryRow = (label, value, yOffset, isBold = false) => {
               doc.fontSize(isBold ? 11 : 10)
                  .fillColor('#000000')
                  .font(isBold ? 'Helvetica-Bold' : 'Helvetica')
                  .text(label, summaryX, summaryTop + yOffset, { width: summaryLabelWidth })
                  .text(value, summaryX + summaryLabelWidth, summaryTop + yOffset, { width: summaryValueWidth, align: 'right' });
            };

            createSummaryRow('Sub Total', `$${order.orderSummary.subtotal.toFixed(2)}`, 0);

            const taxRate = order.orderSummary.taxRate || 13.00;
            createSummaryRow(`Tax (${taxRate}%)`, `$${order.orderSummary.tax.toFixed(2)}`, 20);

            doc.moveTo(summaryX, summaryTop + 45)
               .lineTo(summaryX + summaryLabelWidth + summaryValueWidth, summaryTop + 45)
               .strokeColor('#000000')
               .lineWidth(1)
               .stroke();

            createSummaryRow('Total', `$${order.orderSummary.total.toFixed(2)}`, 55, true);

            const balanceDueY = summaryTop + 85;
            doc.rect(summaryX, balanceDueY, summaryLabelWidth + summaryValueWidth, 30)
               .fillAndStroke('#999999', '#999999');

            doc.fillColor('white')
               .fontSize(12)
               .font('Helvetica-Bold')
               .text('Balance Due', summaryX + 10, balanceDueY + 9)
               .text(`$${order.orderSummary.total.toFixed(2)}`, summaryX + summaryLabelWidth, balanceDueY + 9, { width: summaryValueWidth, align: 'right' });

            // QR Code and Terms section
            const bottomSectionY = summaryTop + 130;

            if (qrCodeBuffer) {
               doc.image(qrCodeBuffer, 50, bottomSectionY, { width: 80 });
               doc.fontSize(8)
                  .fillColor('#333333')
                  .font('Helvetica')
                  .text('Scan to download', 50, bottomSectionY + 85, { width: 80, align: 'center' });
            }

            const termsX = 150;

            doc.fillColor('#000000')
               .fontSize(11)
               .font('Helvetica-Bold')
               .text('Terms & Conditions', termsX, bottomSectionY)
               .fontSize(9)
               .font('Helvetica')
               .text('1. Payment is due within 30 days of invoice date.', termsX, bottomSectionY + 20, { width: 300 })
               .text('2. Late payments may incur additional charges.', termsX, bottomSectionY + 35, { width: 300 })
               .text('3. Goods remain property of seller until payment.', termsX, bottomSectionY + 50, { width: 300 });

            doc.end();

         } catch (error) {
            reject(error);
         }
      });
   }

   // Legacy methods for file-based PDF generation
   static async generateOrderConfirmationPDF(order, items, outputPath) {
      return new Promise(async (resolve, reject) => {
         try {
            const buffer = await this.generateOrderConfirmationPDFBuffer(order, items);
            require('fs').writeFileSync(outputPath, buffer);
            resolve(outputPath);
         } catch (error) {
            reject(error);
         }
      });
   }

   static async generateInvoicePDF(order, items, outputPath) {
      return new Promise(async (resolve, reject) => {
         try {
            const buffer = await this.generateInvoicePDFBuffer(order, items);
            require('fs').writeFileSync(outputPath, buffer);
            resolve(outputPath);
         } catch (error) {
            reject(error);
         }
      });
   }

   static async generateBillPDF(order, items, outputPath) {
      return new Promise(async (resolve, reject) => {
         try {
            const buffer = await this.generateBillPDFBuffer(order, items);
            require('fs').writeFileSync(outputPath, buffer);
            resolve(outputPath);
         } catch (error) {
            reject(error);
         }
      });
   }
}

module.exports = PDFGeneratorService;