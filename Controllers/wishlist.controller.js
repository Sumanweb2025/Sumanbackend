const Wishlist = require('../Models/wishlist.model');
const Product = require('../Models/product.model');

// Get all wishlist items
const getWishlist = async (req, res) => {
  try {
    const wishlist = await Wishlist.find().populate('items.product_id');

    if (!wishlist || wishlist.length === 0) {
      return res.status(404).json({ success: false, message: 'No wishlist items found' });
    }

    res.status(200).json({ success: true, data: wishlist });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching wishlist', error: error.message });
  }
};

// Add item to wishlist
const addToWishlist = async (req, res) => {
  try {
    const { product_id } = req.body;

    // Check if product exists
    const product = await Product.findOne({ product_id });
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    // Check if item already exists in wishlist
    let wishlist = await Wishlist.findOne({ 'items.product_id': product_id });
    
    if (wishlist) {
      return res.status(400).json({ success: false, message: 'Item already in wishlist' });
    }

    // Find existing wishlist or create new one
    wishlist = await Wishlist.findOne();
    if (!wishlist) {
      wishlist = new Wishlist({ items: [] });
    }

    // Add product to wishlist
    wishlist.items.push({ 
      product_id,
      added_date: new Date()
    });
    
    await wishlist.save();

    res.status(200).json({ 
      success: true, 
      message: 'Item added to wishlist', 
      data: {
        product: product,
        wishlist_item: wishlist.items[wishlist.items.length - 1]
      }
    });
  } catch (error) {
    res.status(400).json({ success: false, message: 'Error adding to wishlist', error: error.message });
  }
};

// Remove item from wishlist
const removeFromWishlist = async (req, res) => {
  try {
    const { productId } = req.params;

    const wishlist = await Wishlist.findOne();
    if (!wishlist) {
      return res.status(404).json({ success: false, message: 'Wishlist not found' });
    }

    // Check if item exists in wishlist
    const itemExists = wishlist.items.find(item => item.product_id === productId);
    if (!itemExists) {
      return res.status(404).json({ success: false, message: 'Item not found in wishlist' });
    }

    // Remove item from wishlist
    wishlist.items = wishlist.items.filter(item => item.product_id !== productId);
    await wishlist.save();

    res.status(200).json({ success: true, message: 'Item removed from wishlist', data: wishlist });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error removing from wishlist', error: error.message });
  }
};

// Clear entire wishlist
const clearWishlist = async (req, res) => {
  try {
    const wishlist = await Wishlist.findOne();
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

// Check if product is in wishlist
const checkInWishlist = async (req, res) => {
  try {
    const { productId } = req.params;

    const wishlist = await Wishlist.findOne({ 'items.product_id': productId });
    const isInWishlist = wishlist ? true : false;

    res.status(200).json({ 
      success: true, 
      data: { 
        product_id: productId,
        is_in_wishlist: isInWishlist 
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error checking wishlist', error: error.message });
  }
};

module.exports = {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  clearWishlist,
  checkInWishlist
};