const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  customerName: String,
  address: String,
  items: [String],
  totalAmount: Number,
  status: {
    type: String,
    default: 'Pending'
  }
});

module.exports = mongoose.model('Order', orderSchema);
