const Wishlist = require('../Models/wishlist.model');
const Product = require('../Models/product.model');
const Cart = require('../Models/cart.model');

// Get user's wishlist
const getWishlist = async (req, res) => {
  try {
    const wishlist = await Wishlist.findOne({ username: req.params.username });

    if (!wishlist) {
      return res.status(404).json({ success: false, message: 'Wishlist not found' });
    }

    res.status(200).json({ success: true, data: wishlist });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching wishlist', error: error.message });
  }
};

// Add item to wishlist
const addToWishlist = async (req, res) => {
  try {
    const { username, product_id } = req.body;

    const product = await Product.findOne({ product_id });
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    let wishlist = await Wishlist.findOne({ username });
    if (!wishlist) wishlist = new Wishlist({ username, items: [] });

    const exists = wishlist.items.find(item => item.product_id === product_id);
    if (exists) {
      return res.status(400).json({ success: false, message: 'Item already in wishlist' });
    }

    wishlist.items.push({ product_id });
    await wishlist.save();

    res.status(200).json({ success: true, message: 'Item added to wishlist', data: wishlist });
  } catch (error) {
    res.status(400).json({ success: false, message: 'Error adding to wishlist', error: error.message });
  }
};

// Remove item from wishlist
const removeFromWishlist = async (req, res) => {
  try {
    const { username, productId } = req.params;

    const wishlist = await Wishlist.findOne({ username });
    if (!wishlist) {
      return res.status(404).json({ success: false, message: 'Wishlist not found' });
    }

    wishlist.items = wishlist.items.filter(item => item.product_id !== productId);
    await wishlist.save();

    res.status(200).json({ success: true, message: 'Item removed from wishlist', data: wishlist });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error removing from wishlist', error: error.message });
  }
};

// Clear wishlist
const clearWishlist = async (req, res) => {
  try {
    const { username } = req.params;

    const wishlist = await Wishlist.findOne({ username });
    if (!wishlist) {
      return res.status(404).json({ success: false, message: 'Wishlist not found' });
    }

    wishlist.items = [];
    await wishlist.save();

    res.status(200).json({ success: true, message: 'Wishlist cleared', data: wishlist });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error clearing wishlist', error: error.message });
  }
};

// Move item from wishlist to cart
const moveToCart = async (req, res) => {
  try {
    const { username, productId } = req.params;
    const { quantity = 1 } = req.body;

    const wishlist = await Wishlist.findOne({ username });
    if (!wishlist) {
      return res.status(404).json({ success: false, message: 'Wishlist not found' });
    }

    const wishlistItem = wishlist.items.find(item => item.product_id === productId);
    if (!wishlistItem) {
      return res.status(404).json({ success: false, message: 'Item not found in wishlist' });
    }

    const product = await Product.findOne({ product_id: productId });
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    let cart = await Cart.findOne({ username });
    if (!cart) cart = new Cart({ username, items: [] });

    const existingCartItem = cart.items.find(item => item.product_id === productId);
    if (existingCartItem) {
      existingCartItem.quantity += quantity;
    } else {
      cart.items.push({ product_id: productId, quantity, price: product.price });
    }

    wishlist.items = wishlist.items.filter(item => item.product_id !== productId);
    await Promise.all([cart.save(), wishlist.save()]);

    res.status(200).json({
      success: true,
      message: 'Item moved to cart',
      data: { cart, wishlist }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error moving item to cart', error: error.message });
  }
};

module.exports = {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  clearWishlist,
  moveToCart
};
