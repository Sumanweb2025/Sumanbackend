const Cart = require('../Models/cart.model');
const Product = require('../Models/product.model');
const mongoose = require('mongoose');

// Helper function to validate ObjectId
const isValidObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(id);
};

// Helper function to add imageUrl to product and ensure price is a number
const addImageUrlToProduct = (product, req) => {
  if (!product) return product;
  
  const productObj = product.toObject ? product.toObject() : product;
  return {
    ...productObj,
    imageUrl: productObj.image ? `${req.protocol}://${req.get('host')}/images/Products/${productObj.image}` : null,
    price: parseFloat(productObj.price) || 0 // Ensure price is always a number
  };
};

// Helper function to calculate cart totals
const calculateCartTotals = (cart) => {
  if (!cart || !cart.items || cart.items.length === 0) {
    return { ...cart, totalAmount: 0 };
  }

  const subtotal = cart.items.reduce((total, item) => {
    const price = parseFloat(item.productId?.price) || 0;
    const quantity = parseInt(item.quantity) || 0;
    return total + (price * quantity);
  }, 0);

  const tax = subtotal * 0.13; // 13% Canadian tax
  const shipping = subtotal > 75 ? 0 : 15; // $15 CAD shipping
  const totalAmount = subtotal + tax + shipping;

  return {
    ...cart,
    totalAmount: parseFloat(totalAmount.toFixed(2))
  };
};

// Get user's cart
const getCart = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id || req.userId;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }
    
    const cart = await Cart.findOne({ userId })
      .populate({
        path: 'items.productId',
        select: 'name price image description category'
      });

    if (!cart) {
      return res.status(200).json({
        success: true,
        data: { items: [], totalAmount: 0 },
        message: 'Cart is empty'
      });
    }

    // Add imageUrl to each product and ensure price is a number
    const cartWithImageUrls = {
      ...cart.toObject(),
      items: cart.items.map(item => ({
        ...item,
        quantity: parseInt(item.quantity) || 1,
        productId: addImageUrlToProduct(item.productId, req)
      }))
    };

    // Calculate and add total amount
    const cartWithTotals = calculateCartTotals(cartWithImageUrls);

    res.status(200).json({
      success: true,
      data: cartWithTotals,
      message: 'Cart retrieved successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching cart',
      error: error.message
    });
  }
};

// Add product to cart
const addToCart = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id || req.userId;
    const { productId, quantity = 1 } = req.body;

    // Debug logging
    console.log('User object:', req.user);
    console.log('User ID:', userId);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated or user ID not found'
      });
    }

    // Validate productId format
    if (!productId) {
      return res.status(400).json({
        success: false,
        message: 'Product ID is required'
      });
    }

    // Ensure quantity is a valid number
    const validQuantity = parseInt(quantity) || 1;
    if (validQuantity < 1) {
      return res.status(400).json({
        success: false,
        message: 'Quantity must be at least 1'
      });
    }

    let product;
    
    // Check if productId is a valid ObjectId, if not search by custom field
    if (isValidObjectId(productId)) {
      product = await Product.findById(productId);
    } else {
      // Search by your custom product_id field
      product = await Product.findOne({ product_id: productId });
    }

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Use the actual MongoDB _id for cart operations
    const actualProductId = product._id;

    let cart = await Cart.findOne({ userId });

    if (!cart) {
      // Create new cart
      cart = new Cart({
        userId,
        items: [{ productId: actualProductId, quantity: validQuantity }]
      });
    } else {
      // Check if product already in cart
      const existingItemIndex = cart.items.findIndex(
        item => item.productId.toString() === actualProductId.toString()
      );

      if (existingItemIndex > -1) {
        // Update quantity
        cart.items[existingItemIndex].quantity = parseInt(cart.items[existingItemIndex].quantity) + validQuantity;
      } else {
        // Add new item
        cart.items.push({ productId: actualProductId, quantity: validQuantity });
      }
    }

    await cart.save();
    await cart.populate({
      path: 'items.productId',
      select: 'name price image description category'
    });

    // Add imageUrl to each product in the response and ensure proper data types
    const cartWithImageUrls = {
      ...cart.toObject(),
      items: cart.items.map(item => ({
        ...item,
        quantity: parseInt(item.quantity) || 1,
        productId: addImageUrlToProduct(item.productId, req)
      }))
    };

    // Calculate and add total amount
    const cartWithTotals = calculateCartTotals(cartWithImageUrls);

    res.status(200).json({
      success: true,
      data: cartWithTotals,
      message: 'Product added to cart successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error adding to cart',
      error: error.message
    });
  }
};

// Update cart item quantity
const updateCartItem = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id || req.userId;
    const { productId } = req.params;
    const { quantity } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    const validQuantity = parseInt(quantity) || 1;
    if (validQuantity < 1) {
      return res.status(400).json({
        success: false,
        message: 'Quantity must be at least 1'
      });
    }

    const cart = await Cart.findOne({ userId });
    
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found'
      });
    }

    let actualProductId;

    // Handle both ObjectId and custom ID formats
    if (isValidObjectId(productId)) {
      actualProductId = productId;
    } else {
      // Find the product first to get its ObjectId
      const product = await Product.findOne({ product_id: productId });
      
      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Product not found'
        });
      }
      
      actualProductId = product._id.toString();
    }

    const itemIndex = cart.items.findIndex(
      item => item.productId.toString() === actualProductId.toString()
    );

    if (itemIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Product not found in cart'
      });
    }

    cart.items[itemIndex].quantity = validQuantity;
    await cart.save();
    await cart.populate({
      path: 'items.productId',
      select: 'name price image description category'
    });

    // Add imageUrl to each product in the response and ensure proper data types
    const cartWithImageUrls = {
      ...cart.toObject(),
      items: cart.items.map(item => ({
        ...item,
        quantity: parseInt(item.quantity) || 1,
        productId: addImageUrlToProduct(item.productId, req)
      }))
    };

    // Calculate and add total amount
    const cartWithTotals = calculateCartTotals(cartWithImageUrls);

    res.status(200).json({
      success: true,
      data: cartWithTotals,
      message: 'Cart updated successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating cart',
      error: error.message
    });
  }
};

// Remove product from cart
const removeFromCart = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id || req.userId;
    const { productId } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    const cart = await Cart.findOne({ userId });
    
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found'
      });
    }

    let actualProductId;

    // Handle both ObjectId and custom ID formats
    if (isValidObjectId(productId)) {
      actualProductId = productId;
    } else {
      // Find the product first to get its ObjectId
      const product = await Product.findOne({ product_id: productId });
      
      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Product not found'
        });
      }
      
      actualProductId = product._id.toString();
    }

    cart.items = cart.items.filter(
      item => item.productId.toString() !== actualProductId.toString()
    );

    await cart.save();
    await cart.populate({
      path: 'items.productId',
      select: 'name price image description category'
    });

    // Add imageUrl to each product in the response and ensure proper data types
    const cartWithImageUrls = {
      ...cart.toObject(),
      items: cart.items.map(item => ({
        ...item,
        quantity: parseInt(item.quantity) || 1,
        productId: addImageUrlToProduct(item.productId, req)
      }))
    };

    // Calculate and add total amount
    const cartWithTotals = calculateCartTotals(cartWithImageUrls);

    res.status(200).json({
      success: true,
      data: cartWithTotals,
      message: 'Product removed from cart successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error removing from cart',
      error: error.message
    });
  }
};

// Clear entire cart
const clearCart = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id || req.userId;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }
    
    await Cart.findOneAndUpdate(
      { userId },
      { items: [], totalAmount: 0 },
      { new: true }
    );

    res.status(200).json({
      success: true,
      data: { items: [], totalAmount: 0 },
      message: 'Cart cleared successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error clearing cart',
      error: error.message
    });
  }
};

// Get cart count
const getCartCount = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id || req.userId;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }
    
    const cart = await Cart.findOne({ userId });
    const count = cart ? cart.items.reduce((total, item) => total + (parseInt(item.quantity) || 0), 0) : 0;

    res.status(200).json({
      success: true,
      data: { count },
      message: 'Cart count retrieved successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error getting cart count',
      error: error.message
    });
  }
};

module.exports = {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
  getCartCount
};