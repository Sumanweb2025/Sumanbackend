const Cart = require('../Models/cart.model');
const Product = require('../Models/product.model');
const User = require('../Models/user.model');
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

// Helper function to get or create session ID
const getSessionId = (req) => {
  // Check for session ID in header or generate new one
  return req.header('X-Session-ID') || req.body.sessionId || uuidv4();
};

// Helper function to validate ObjectId
const isValidObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(id);
};

// Helper function to add imageUrl to product and ensure price is a number
const addImageUrlToProduct = (product, req) => {
  if (!product) return product;

  const productObj = product.toObject ? product.toObject() : product;

  let imageUrl = null;
  let imageUrls = [];
  
  if (productObj.image) {
    if (Array.isArray(productObj.image)) {
      // Handle array of images
      imageUrls = productObj.image.map(img => 
        `${req.protocol}://${req.get('host')}/images/Products/${img}`
      );
      imageUrl = imageUrls[0]; // First image as primary
    } else {
      // Handle single image string
      imageUrl = `${req.protocol}://${req.get('host')}/images/Products/${productObj.image}`;
      imageUrls = [imageUrl];
    }
  }

  return {
    ...productObj,
    imageUrl,
    imageUrls,
    price: parseFloat(productObj.price) || 0 // Ensure price is always a number
  };
};

// Helper function to calculate cart totals
const calculateCartTotals = (cart) => {
  if (!cart || !cart.items || cart.items.length === 0) {
    return { ...cart, totalAmount: 0, shipping: 0 };
  }

  const subtotal = cart.items.reduce((total, item) => {
    const price = parseFloat(item.productId?.price) || 0;
    const quantity = parseInt(item.quantity) || 0;
    return total + (price * quantity);
  }, 0);

  const tax = subtotal * 0.13; // 13% HST (Canada)
  const shipping = subtotal >= 75 ? 0 : 9.99;

  const totalAmount = subtotal + tax + shipping;

  return {
    ...cart,
    subtotal: parseFloat(subtotal.toFixed(2)),
    tax: parseFloat(tax.toFixed(2)),
    shipping: parseFloat(shipping.toFixed(2)),
    totalAmount: parseFloat(totalAmount.toFixed(2)),
  };
};

// Get cart (supports both guest and logged-in users)
const getCart = async (req, res) => {
  try {
    const { isGuest, userId } = req.user;
    let cart;

    if (isGuest) {
      // Guest user - use session ID
      const sessionId = getSessionId(req);
      cart = await Cart.findOne({ sessionId, isGuest: true })
        .populate({
          path: 'items.productId',
          select: 'product_id name brand category price description gram piece rating review_count image'
        });

      // Return session ID for frontend to store
      if (cart) {
        res.set('X-Session-ID', sessionId);
      }
    } else {
      // Logged-in user
      cart = await Cart.findOne({ userId })
        .populate({
          path: 'items.productId',
          select: 'product_id name brand category price description gram piece rating review_count image'
        });
    }

    if (!cart) {
      return res.status(200).json({
        success: true,
        data: { 
          items: [], 
          totalAmount: 0,
          sessionId: isGuest ? getSessionId(req) : null
        },
        message: 'Cart is empty'
      });
    }

    const validItems = cart.items.filter(item => item.productId !== null);

    if (validItems.length !== cart.items.length) {
      cart.items = validItems;
      await cart.save();
    }

    const cartWithImageUrls = {
      ...cart.toObject(),
      items: validItems.map(item => ({
        ...item,
        quantity: parseInt(item.quantity) || 1,
        productId: addImageUrlToProduct(item.productId, req)
      }))
    };

    const cartWithTotals = calculateCartTotals(cartWithImageUrls);

    res.status(200).json({
      success: true,
      data: {
        ...cartWithTotals,
        sessionId: isGuest ? cart.sessionId : null
      },
      message: 'Cart retrieved successfully'
    });
  } catch (error) {
    console.error('Error in getCart:', error);
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
    const { isGuest, userId } = req.user;
    const { productId, quantity = 1 } = req.body;

    if (!productId) {
      return res.status(400).json({
        success: false,
        message: 'Product ID is required'
      });
    }

    const validQuantity = parseInt(quantity) || 1;
    if (validQuantity < 1) {
      return res.status(400).json({
        success: false,
        message: 'Quantity must be at least 1'
      });
    }

    let product;
    if (isValidObjectId(productId)) {
      product = await Product.findById(productId);
    } else {
      product = await Product.findOne({ product_id: productId });
    }

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    const actualProductId = product._id;
    let cart;

    if (isGuest) {
      // Guest user logic
      const sessionId = getSessionId(req);
      
      cart = await Cart.findOne({ sessionId, isGuest: true });

      if (!cart) {
        cart = new Cart({
          sessionId,
          isGuest: true,
          items: [{ productId: actualProductId, quantity: validQuantity }]
        });
      } else {
        const existingItemIndex = cart.items.findIndex(
          item => item.productId.toString() === actualProductId.toString()
        );

        if (existingItemIndex > -1) {
          cart.items[existingItemIndex].quantity += validQuantity;
        } else {
          cart.items.push({ productId: actualProductId, quantity: validQuantity });
        }
      }

      await cart.save();
      res.set('X-Session-ID', sessionId); // Send session ID back

    } else {
      // Logged-in user logic
      cart = await Cart.findOne({ userId });

      if (!cart) {
        cart = new Cart({
          userId,
          isGuest: false,
          items: [{ productId: actualProductId, quantity: validQuantity }]
        });
      } else {
        const existingItemIndex = cart.items.findIndex(
          item => item.productId.toString() === actualProductId.toString()
        );

        if (existingItemIndex > -1) {
          cart.items[existingItemIndex].quantity += validQuantity;
        } else {
          cart.items.push({ productId: actualProductId, quantity: validQuantity });
        }
      }

      await cart.save();

      // Update user's cart array
      const user = await User.findById(userId);
      const existingCartItem = user.cart.find(
        (item) => item.product.toString() === actualProductId.toString()
      );

      if (existingCartItem) {
        existingCartItem.quantity += validQuantity;
      } else {
        user.cart.push({ product: actualProductId, quantity: validQuantity });
      }
      await user.save();
    }

    await cart.populate({
      path: 'items.productId',
      select: 'product_id name brand category price description gram piece rating review_count image'
    });

    const cartWithImageUrls = {
      ...cart.toObject(),
      items: cart.items.map(item => ({
        ...item,
        quantity: parseInt(item.quantity) || 1,
        productId: addImageUrlToProduct(item.productId, req)
      }))
    };

    const cartWithTotals = calculateCartTotals(cartWithImageUrls);

    res.status(200).json({
      success: true,
      data: {
        ...cartWithTotals,
        sessionId: isGuest ? cart.sessionId : null
      },
      message: 'Product added to cart successfully'
    });
  } catch (error) {
    console.error('Error in addToCart:', error);
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
    const { isGuest, userId } = req.user;
    const { productId } = req.params;
    const { quantity } = req.body;

    const validQuantity = parseInt(quantity) || 1;
    if (validQuantity < 1) {
      return res.status(400).json({
        success: false,
        message: 'Quantity must be at least 1'
      });
    }

    let cart;
    
    if (isGuest) {
      const sessionId = getSessionId(req);
      cart = await Cart.findOne({ sessionId, isGuest: true });
    } else {
      cart = await Cart.findOne({ userId });
    }

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found'
      });
    }

    let actualProductId;
    if (isValidObjectId(productId)) {
      actualProductId = productId;
    } else {
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

    // Update user cart if logged in
    if (!isGuest) {
      await User.updateOne(
        { _id: userId, "cart.product": actualProductId },
        { $set: { "cart.$.quantity": validQuantity } }
      );
    }

    await cart.populate({
      path: 'items.productId',
      select: 'product_id name brand category price description gram piece rating review_count image'
    });

    cart.items = cart.items.filter(item => item.productId !== null);

    const cartWithImageUrls = {
      ...cart.toObject(),
      items: cart.items.map(item => ({
        ...item,
        quantity: parseInt(item.quantity) || 1,
        productId: addImageUrlToProduct(item.productId, req)
      }))
    };

    const cartWithTotals = calculateCartTotals(cartWithImageUrls);

    res.status(200).json({
      success: true,
      data: {
        ...cartWithTotals,
        sessionId: isGuest ? cart.sessionId : null
      },
      message: 'Cart updated successfully'
    });
  } catch (error) {
    console.error('Error in updateCartItem:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating cart',
      error: error.message
    });
  }
};

// Remove from cart, clear cart - இதே pattern-ல implement பண்ணுங்க

const removeFromCart = async (req, res) => {
  try {
    const { isGuest, userId } = req.user;
    const { productId } = req.params;

    let cart;
    
    if (isGuest) {
      const sessionId = getSessionId(req);
      cart = await Cart.findOne({ sessionId, isGuest: true });
    } else {
      cart = await Cart.findOne({ userId });
    }

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found'
      });
    }

    let actualProductId;
    if (isValidObjectId(productId)) {
      actualProductId = productId;
    } else {
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

    if (!isGuest) {
      await User.findByIdAndUpdate(
        userId,
        { $pull: { cart: { product: actualProductId } } },
        { new: true }
      );
    }

    await cart.populate({
      path: 'items.productId',
      select: 'product_id name brand category price description gram piece rating review_count image'
    });

    cart.items = cart.items.filter(item => item.productId !== null);

    const cartWithImageUrls = {
      ...cart.toObject(),
      items: cart.items.map(item => ({
        ...item,
        quantity: parseInt(item.quantity) || 1,
        productId: addImageUrlToProduct(item.productId, req)
      }))
    };

    const cartWithTotals = calculateCartTotals(cartWithImageUrls);

    res.status(200).json({
      success: true,
      data: {
        ...cartWithTotals,
        sessionId: isGuest ? cart.sessionId : null
      },
      message: 'Product removed from cart successfully'
    });
  } catch (error) {
    console.error('Error in removeFromCart:', error);
    res.status(500).json({
      success: false,
      message: 'Error removing from cart',
      error: error.message
    });
  }
};

const clearCart = async (req, res) => {
  try {
    const { isGuest, userId } = req.user;

    if (isGuest) {
      const sessionId = getSessionId(req);
      await Cart.findOneAndUpdate(
        { sessionId, isGuest: true },
        { items: [], totalAmount: 0 },
        { new: true }
      );
    } else {
      await Cart.findOneAndUpdate(
        { userId },
        { items: [], totalAmount: 0 },
        { new: true }
      );

      await User.findByIdAndUpdate(
        userId,
        { $set: { cart: [] } },
        { new: true }
      );
    }

    res.status(200).json({
      success: true,
      data: { 
        items: [], 
        totalAmount: 0,
        sessionId: isGuest ? getSessionId(req) : null
      },
      message: 'Cart cleared successfully'
    });
  } catch (error) {
    console.error('Error in clearCart:', error);
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
    const { isGuest, userId } = req.user;
    let cart;

    if (isGuest) {
      const sessionId = getSessionId(req);
      cart = await Cart.findOne({ sessionId, isGuest: true });
    } else {
      cart = await Cart.findOne({ userId });
    }

    const count = cart ? cart.items.reduce((total, item) => total + (parseInt(item.quantity) || 0), 0) : 0;

    res.status(200).json({
      success: true,
      data: { count },
      message: 'Cart count retrieved successfully'
    });
  } catch (error) {
    console.error('Error in getCartCount:', error);
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