const Cart = require('../Models/cart.model');
const Product = require('../Models/product.model');

// Get user's cart
const getCart = async (req, res) => {
  try {
    const cart = await Cart.findOne({ username: req.params.username });

    if (!cart) {
      return res.status(404).json({ success: false, message: 'Cart not found' });
    }

    res.status(200).json({ success: true, data: cart });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching cart', error: error.message });
  }
};

// Add item to cart
const addToCart = async (req, res) => {
  try {
    const { username, product_id, quantity = 1 } = req.body;

    const product = await Product.findOne({ product_id });
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    let cart = await Cart.findOne({ username });
    if (!cart) cart = new Cart({ username, items: [] });

    const existingItem = cart.items.find(item => item.product_id === product_id);

    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      cart.items.push({ product_id, quantity, price: product.price });
    }

    await cart.save();
    res.status(200).json({ success: true, message: 'Item added to cart successfully', data: cart });
  } catch (error) {
    res.status(400).json({ success: false, message: 'Error adding item to cart', error: error.message });
  }
};

// Update cart item quantity
const updateCartItem = async (req, res) => {
  try {
    const { username, productId } = req.params;
    const { quantity } = req.body;

    const cart = await Cart.findOne({ username });
    if (!cart) return res.status(404).json({ success: false, message: 'Cart not found' });

    const item = cart.items.find(item => item.product_id === productId);
    if (!item) return res.status(404).json({ success: false, message: 'Item not found in cart' });

    item.quantity = quantity;
    await cart.save();

    res.status(200).json({ success: true, message: 'Cart item updated successfully', data: cart });
  } catch (error) {
    res.status(400).json({ success: false, message: 'Error updating cart item', error: error.message });
  }
};

// Remove item from cart
const removeFromCart = async (req, res) => {
  try {
    const { username, productId } = req.params;

    const cart = await Cart.findOne({ username });
    if (!cart) return res.status(404).json({ success: false, message: 'Cart not found' });

    cart.items = cart.items.filter(item => item.product_id !== productId);
    await cart.save();

    res.status(200).json({ success: true, message: 'Item removed from cart successfully', data: cart });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error removing item from cart', error: error.message });
  }
};

// Clear cart
const clearCart = async (req, res) => {
  try {
    const { username } = req.params;

    const cart = await Cart.findOne({ username });
    if (!cart) return res.status(404).json({ success: false, message: 'Cart not found' });

    cart.items = [];
    await cart.save();

    res.status(200).json({ success: true, message: 'Cart cleared successfully', data: cart });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error clearing cart', error: error.message });
  }
};

module.exports = {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart
};
