const Wishlist = require('../Models/wishlist.model');
const Product = require('../Models/product.model');
const User = require('../Models/user.model');
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

// Helper function to get or create session ID
const getSessionId = (req) => {
  return req.header('X-Session-ID') || req.body.sessionId || uuidv4();
};

// Helper function to validate ObjectId
const isValidObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(id);
};

// Helper function to add imageUrl to product
const addImageUrlToProduct = (product, req) => {
  if (!product) return product;

  const productObj = product.toObject ? product.toObject() : product;
  return {
    ...productObj,
    imageUrl: productObj.image ? `${req.protocol}://${req.get('host')}/images/Products/${productObj.image}` : null
  };
};

// Get wishlist (supports both guest and logged-in users)
const getWishlist = async (req, res) => {
  try {
    const { isGuest, userId } = req.user;
    let wishlist;

    if (isGuest) {
      // Guest user - use session ID
      const sessionId = getSessionId(req);
      wishlist = await Wishlist.findOne({ sessionId, isGuest: true })
        .populate({
          path: 'products.productId',
          select: 'name price image description category brand rating product_id piece'
        });

      if (wishlist) {
        res.set('X-Session-ID', sessionId);
      }
    } else {
      // Logged-in user
      wishlist = await Wishlist.findOne({ userId })
        .populate({
          path: 'products.productId',
          select: 'name price image description category brand rating product_id piece'
        });
    }

    if (!wishlist) {
      return res.status(200).json({
        success: true,
        data: { 
          products: [],
          sessionId: isGuest ? getSessionId(req) : null
        },
        message: 'Wishlist is empty'
      });
    }

    // Add imageUrl to each product
    const wishlistWithImageUrls = {
      ...wishlist.toObject(),
      products: wishlist.products.map(item => ({
        ...item,
        productId: addImageUrlToProduct(item.productId, req)
      }))
    };

    res.status(200).json({
      success: true,
      data: {
        ...wishlistWithImageUrls,
        sessionId: isGuest ? wishlist.sessionId : null
      },
      message: 'Wishlist retrieved successfully'
    });
  } catch (error) {
    console.error('Error in getWishlist:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching wishlist',
      error: error.message
    });
  }
};

// Add to wishlist (supports both guest and logged-in users)
const addToWishlist = async (req, res) => {
  try {
    const { isGuest, userId } = req.user;
    const { productId } = req.body;

    if (!productId) {
      return res.status(400).json({
        success: false,
        message: 'Product ID is required'
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
    let wishlist;

    if (isGuest) {
      // Guest user logic
      const sessionId = getSessionId(req);
      
      wishlist = await Wishlist.findOne({ sessionId, isGuest: true });

      if (!wishlist) {
        wishlist = new Wishlist({
          sessionId,
          isGuest: true,
          products: [{ productId: actualProductId }]
        });
      } else {
        const existingProduct = wishlist.products.find(
          item => item.productId.toString() === actualProductId.toString()
        );

        if (existingProduct) {
          return res.status(400).json({
            success: false,
            message: 'Product already in wishlist'
          });
        }

        wishlist.products.push({ productId: actualProductId });
      }

      await wishlist.save();
      res.set('X-Session-ID', sessionId);

    } else {
      // Logged-in user logic
      wishlist = await Wishlist.findOne({ userId });

      if (!wishlist) {
        wishlist = new Wishlist({
          userId,
          isGuest: false,
          products: [{ productId: actualProductId }]
        });
      } else {
        const existingProduct = wishlist.products.find(
          item => item.productId.toString() === actualProductId.toString()
        );

        if (existingProduct) {
          return res.status(400).json({
            success: false,
            message: 'Product already in wishlist'
          });
        }

        wishlist.products.push({ productId: actualProductId });
      }

      await wishlist.save();

      // Update user's wishlist array
      await User.findByIdAndUpdate(
        userId,
        { $addToSet: { wishlist: actualProductId } },
        { new: true }
      );
    }

    await wishlist.populate({
      path: 'products.productId',
      select: 'name price image description category brand rating product_id piece'
    });

    const wishlistWithImageUrls = {
      ...wishlist.toObject(),
      products: wishlist.products.map(item => ({
        ...item,
        productId: addImageUrlToProduct(item.productId, req)
      }))
    };

    res.status(200).json({
      success: true,
      data: {
        ...wishlistWithImageUrls,
        sessionId: isGuest ? wishlist.sessionId : null
      },
      message: 'Product added to wishlist successfully'
    });
  } catch (error) {
    console.error('Error in addToWishlist:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding to wishlist',
      error: error.message
    });
  }
};

// Remove from wishlist (supports both guest and logged-in users)
const removeFromWishlist = async (req, res) => {
  try {
    const { isGuest, userId } = req.user;
    const { productId } = req.params;

    let wishlist;
    
    if (isGuest) {
      const sessionId = getSessionId(req);
      wishlist = await Wishlist.findOne({ sessionId, isGuest: true });
    } else {
      wishlist = await Wishlist.findOne({ userId });
    }

    if (!wishlist) {
      return res.status(404).json({
        success: false,
        message: 'Wishlist not found'
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

    wishlist.products = wishlist.products.filter(
      item => item.productId.toString() !== actualProductId.toString()
    );

    await wishlist.save();

    if (!isGuest) {
      await User.findByIdAndUpdate(
        userId,
        { $pull: { wishlist: actualProductId } },
        { new: true }
      );
    }

    await wishlist.populate({
      path: 'products.productId',
      select: 'name price image description category brand rating product_id piece'
    });

    const wishlistWithImageUrls = {
      ...wishlist.toObject(),
      products: wishlist.products.map(item => ({
        ...item,
        productId: addImageUrlToProduct(item.productId, req)
      }))
    };

    res.status(200).json({
      success: true,
      data: {
        ...wishlistWithImageUrls,
        sessionId: isGuest ? wishlist.sessionId : null
      },
      message: 'Product removed from wishlist successfully'
    });
  } catch (error) {
    console.error('Error in removeFromWishlist:', error);
    res.status(500).json({
      success: false,
      message: 'Error removing from wishlist',
      error: error.message
    });
  }
};

// Clear wishlist (supports both guest and logged-in users)
const clearWishlist = async (req, res) => {
  try {
    const { isGuest, userId } = req.user;

    if (isGuest) {
      const sessionId = getSessionId(req);
      await Wishlist.findOneAndUpdate(
        { sessionId, isGuest: true },
        { products: [] },
        { new: true }
      );
    } else {
      await Wishlist.findOneAndUpdate(
        { userId },
        { products: [] },
        { new: true }
      );

      await User.findByIdAndUpdate(
        userId,
        { $set: { wishlist: [] } },
        { new: true }
      );
    }

    res.status(200).json({
      success: true,
      data: {
        products: [],
        sessionId: isGuest ? getSessionId(req) : null
      },
      message: 'Wishlist cleared successfully'
    });
  } catch (error) {
    console.error('Error in clearWishlist:', error);
    res.status(500).json({
      success: false,
      message: 'Error clearing wishlist',
      error: error.message
    });
  }
};

module.exports = {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  clearWishlist
};