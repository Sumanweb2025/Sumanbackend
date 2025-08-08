const Wishlist = require('../Models/wishlist.model');
const Product = require('../Models/product.model');
const mongoose = require('mongoose');

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

// Get user's wishlist
const getWishlist = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id || req.userId;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }
    
    const wishlist = await Wishlist.findOne({ userId })
      .populate({
        path: 'products.productId',
        select: 'name price image description category brand rating product_id piece'
      });

    if (!wishlist) {
      return res.status(200).json({
        success: true,
        data: { products: [] },
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
      data: wishlistWithImageUrls,
      message: 'Wishlist retrieved successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching wishlist',
      error: error.message
    });
  }
};

// Add product to wishlist
const addToWishlist = async (req, res) => {
  try {
    // Try different possible user ID locations
    const userId = req.user?.id || req.user?._id || req.userId;
    const { productId } = req.body;

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

    // Use the actual MongoDB _id for wishlist operations
    const actualProductId = product._id;

    let wishlist = await Wishlist.findOne({ userId });

    if (!wishlist) {
      // Create new wishlist
      wishlist = new Wishlist({
        userId,
        products: [{ productId: actualProductId }]
      });
    } else {
      // Check if product already in wishlist
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
    await wishlist.populate({
      path: 'products.productId',
      select: 'name price image description category brand rating product_id piece'
    });

    // Add imageUrl to each product in the response
    const wishlistWithImageUrls = {
      ...wishlist.toObject(),
      products: wishlist.products.map(item => ({
        ...item,
        productId: addImageUrlToProduct(item.productId, req)
      }))
    };

    res.status(200).json({
      success: true,
      data: wishlistWithImageUrls,
      message: 'Product added to wishlist successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error adding to wishlist',
      error: error.message
    });
  }
};

// Remove product from wishlist
const removeFromWishlist = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id || req.userId;
    const { productId } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    const wishlist = await Wishlist.findOne({ userId });
    
    if (!wishlist) {
      return res.status(404).json({
        success: false,
        message: 'Wishlist not found'
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

    wishlist.products = wishlist.products.filter(
      item => item.productId.toString() !== actualProductId.toString()
    );

    await wishlist.save();
    await wishlist.populate({
      path: 'products.productId',
      select: 'name price image description category brand rating product_id piece'
    });

    // Add imageUrl to each product in the response
    const wishlistWithImageUrls = {
      ...wishlist.toObject(),
      products: wishlist.products.map(item => ({
        ...item,
        productId: addImageUrlToProduct(item.productId, req)
      }))
    };

    res.status(200).json({
      success: true,
      data: wishlistWithImageUrls,
      message: 'Product removed from wishlist successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error removing from wishlist',
      error: error.message
    });
  }
};

// Clear entire wishlist
const clearWishlist = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id || req.userId;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }
    
    await Wishlist.findOneAndUpdate(
      { userId },
      { products: [] },
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: 'Wishlist cleared successfully'
    });
  } catch (error) {
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