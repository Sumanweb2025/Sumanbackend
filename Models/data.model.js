const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  product_id: String,
  name: String,
  brand: String,
  category: String,
  price: Number,
  piece: Number,
  rating: Number,
  description: String,
  image: String,
  gram: String
});

module.exports = mongoose.model('Product', productSchema);
