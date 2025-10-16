const express = require('express');
const router = express.Router();
const PDFGeneratorService = require('../Services/pdfGenerator'); // Adjust path
const Order = require('../Models/order.model'); // Your existing Order model

// Invoice download route
router.get('/download-invoice/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;

    // Get order from your existing Order model
    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).send('Invoice not found');
    }

    // Get items from order (adjust property name as per your model)
    const orderItems = order.items || order.orderItems || order.products || [];

    let pdfBuffer;
    let filename;

    // Generate appropriate PDF based on payment method
    if (order.paymentMethod === 'cod') {
      // For COD orders, generate Bill PDF
      pdfBuffer = await PDFGeneratorService.generateBillPDFBuffer(order, orderItems);
      filename = `Bill-${order.orderNumber}.pdf`;
    } else {
      // For online payment orders, generate Paid Invoice PDF
      pdfBuffer = await PDFGeneratorService.generateInvoicePDFBuffer(order, orderItems);
      filename = `Invoice-${order.orderNumber}.pdf`;
    }

    // Send PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(pdfBuffer);

  } catch (error) {
    console.error('Invoice download error:', error);
    res.status(500).send('Error downloading invoice');
  }
});

module.exports = router;