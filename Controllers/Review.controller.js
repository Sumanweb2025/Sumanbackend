
const Review = require('../Models/Review.model');
const Product = require('../Models/product.model');

// Get all reviews for a product
const getProductReviews = async (req, res) => {
  try {
    const { productId } = req.params;

    const reviews = await Review.find({ product_id: productId })
      .sort({ createdAt: -1 })
      .populate('user_id', 'name email');

    // Calculate average rating
    const avgRating = await Review.aggregate([
      { $match: { product_id: productId } },
      { $group: { _id: null, avgRating: { $avg: '$rating' }, totalReviews: { $sum: 1 } } }
    ]);

    const averageRating = avgRating[0]?.avgRating || 0;
    const totalReviews = avgRating[0]?.totalReviews || 0;

    res.status(200).json({
      success: true,
      data: {
        reviews,
        totalReviews,
        averageRating
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching reviews',
      error: error.message
    });
  }
};

// Create a new review
const createReview = async (req, res) => {
  try {
    const { productId } = req.params;
    const { rating, comment } = req.body;
    
    // Validation for required fields
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'User authentication required'
      });
    }
    
    if (!productId) {
      return res.status(400).json({
        success: false,
        message: 'Product ID is required'
      });
    }

    if (!rating || !comment) {
      return res.status(400).json({
        success: false,
        message: 'Rating and comment are required'
      });
    }

    const userId = req.user.id;
    const userName = req.user.name || req.user.email || 'Anonymous User';

    //console.log('Creating review with:', { productId, userId, userName, rating });

    // Check if user has already reviewed this product
    const existingReview = await Review.findOne({
      product_id: productId,
      user_id: userId
    });

    if (existingReview) {
      return res.status(400).json({
        success: false,
        message: 'You have already reviewed this product'
      });
    }

    // FIXED: Check if product exists using only product_id field (not _id)
    // Since your products use custom string IDs, we should only search by product_id
    const product = await Product.findOne({ product_id: productId });
    
    if (!product) {
      console.log(`Product not found with product_id: ${productId}`);
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    //console.log('Product found:', product.name);

    // Create review
    const review = new Review({
      product_id: productId,
      user_id: userId,
      user_name: userName,
      rating: parseInt(rating),
      comment: comment.trim()
    });

    const savedReview = await review.save();
    //console.log('Review saved successfully:', savedReview._id);

    // Update product's average rating
    await updateProductRating(productId);

    res.status(201).json({
      success: true,
      message: 'Review submitted successfully',
      data: savedReview
    });
  } catch (error) {
    console.error('Create review error:', error);
    res.status(400).json({
      success: false,
      message: 'Error creating review',
      error: error.message
    });
  }
};

// Get user's review for a specific product
const getUserReview = async (req, res) => {
  try {
    const { productId } = req.params;
    
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'User authentication required'
      });
    }
    
    const userId = req.user.id;

    const review = await Review.findOne({
      product_id: productId,
      user_id: userId
    });

    res.status(200).json({
      success: true,
      data: review
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching user review',
      error: error.message
    });
  }
};

// FIXED: Update product rating helper function
const updateProductRating = async (productId) => {
  try {
    const result = await Review.aggregate([
      { $match: { product_id: productId } },
      { 
        $group: { 
          _id: null, 
          avgRating: { $avg: '$rating' },
          totalReviews: { $sum: 1 }
        } 
      }
    ]);

    const avgRating = result[0]?.avgRating || 0;
    const totalReviews = result[0]?.totalReviews || 0;
    
    //console.log(`Updating product ${productId} rating: ${avgRating}, reviews: ${totalReviews}`);
    
    // FIXED: Only use product_id field, not _id
    const updateResult = await Product.findOneAndUpdate(
      { product_id: productId },
      { 
        rating: Math.round(avgRating * 10) / 10, // Round to 1 decimal
        review_count: totalReviews
      },
      { new: true }
    );
    
    if (updateResult) {
      console.log(`Product rating updated successfully for ${productId}`);
    } else {
      console.log(`Product not found for rating update: ${productId}`);
    }
  } catch (error) {
    console.error('Error updating product rating:', error);
  }
};

module.exports = {
  getProductReviews,
  createReview,
  getUserReview
};