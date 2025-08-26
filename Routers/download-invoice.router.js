const express = require('express');
const router = express.Router();
const PDFGeneratorService = require('../Services/pdfGenerator'); // Adjust path
const Order = require('../Models/order.model'); // Your existing Order model

// Invoice download route
router.get('/download-invoice/:orderNumber', async (req, res) => {
  try {
    const { orderNumber } = req.params;
    
    // Get order from your existing Order model
    const order = await Order.findOne({ orderNumber: orderNumber });

    if (!order) {
      return res.status(404).send('Invoice not found');
    }

    // Get items from order (adjust property name as per your model)
    const orderItems = order.items || order.orderItems || order.products || [];

    // Generate PDF
    const pdfBuffer = await PDFGeneratorService.generateInvoicePDFBuffer(order, orderItems);

    // Send PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Invoice-${orderNumber}.pdf"`);
    res.send(pdfBuffer);

  } catch (error) {
    console.error('Invoice download error:', error);
    res.status(500).send('Error downloading invoice');
  }
});

module.exports = router;