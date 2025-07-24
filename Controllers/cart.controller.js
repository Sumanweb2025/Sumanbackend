const Cart = require('../Models/cart.model');
const Product = require('../Models/product.model');

// Get cart (single cart for all)
const getCart = async (req, res) => {
  try {
    let cart = await Cart.findOne({});
    
    if (!cart) {
      cart = new Cart({ items: [] });
      await cart.save();
    }

    res.status(200).json({ success: true, data: cart });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching cart', error: error.message });
  }
};

// Add item to cart
const addToCart = async (req, res) => {
  try {
    const { product_id, quantity = 1 } = req.body;

    // Check if product exists
    const product = await Product.findOne({ product_id });
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    // Find or create cart
    let cart = await Cart.findOne({});
    if (!cart) {
      cart = new Cart({ items: [] });
    }

    // Check if item already exists in cart
    const existingItem = cart.items.find(item => item.product_id === product_id);

    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      cart.items.push({ 
        product_id, 
        quantity, 
        price: product.price,
        name: product.name,
        image: product.image
      });
    }

    await cart.save();
    res.status(200).json({ 
      success: true, 
      message: 'Item added to cart successfully', 
      data: cart
    });
  } catch (error) {
    res.status(400).json({ success: false, message: 'Error adding item to cart', error: error.message });
  }
};

// Update cart item quantity
const updateCartItem = async (req, res) => {
  try {
    const { productId } = req.params;
    const { quantity } = req.body;

    const cart = await Cart.findOne({});
    if (!cart) {
      return res.status(404).json({ success: false, message: 'Cart not found' });
    }

    const item = cart.items.find(item => item.product_id === productId);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Item not found in cart' });
    }

    if (quantity <= 0) {
      // Remove item if quantity is 0 or negative
      cart.items = cart.items.filter(item => item.product_id !== productId);
    } else {
      item.quantity = quantity;
    }

    await cart.save();
    res.status(200).json({ success: true, message: 'Cart item updated successfully', data: cart });
  } catch (error) {
    res.status(400).json({ success: false, message: 'Error updating cart item', error: error.message });
  }
};

// Remove item from cart
const removeFromCart = async (req, res) => {
  try {
    const { productId } = req.params;

    const cart = await Cart.findOne({});
    if (!cart) {
      return res.status(404).json({ success: false, message: 'Cart not found' });
    }

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
    const cart = await Cart.findOne({});
    if (!cart) {
      return res.status(404).json({ success: false, message: 'Cart not found' });
    }

    cart.items = [];
    await cart.save();

    res.status(200).json({ success: true, message: 'Cart cleared successfully', data: cart });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error clearing cart', error: error.message });
  }
};

// Get cart total
const getCartTotal = async (req, res) => {
  try {
    const cart = await Cart.findOne({});
    if (!cart) {
      return res.status(404).json({ success: false, message: 'Cart not found' });
    }

    const total = cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const itemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);

    res.status(200).json({ 
      success: true, 
      data: { 
        total, 
        itemCount, 
        items: cart.items 
      } 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error calculating cart total', error: error.message });
  }
};

module.exports = {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
  getCartTotal
};