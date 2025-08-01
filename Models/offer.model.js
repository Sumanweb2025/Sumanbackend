const mongoose = require('mongoose');

const offerSchema = new mongoose.Schema({
  title: String,
  description: String,
  discount: Number,
  startDate: Date,
  endDate: Date
});

module.exports = mongoose.model('Offer', offerSchema);
