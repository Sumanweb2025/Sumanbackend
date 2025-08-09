
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
    const userId = req.user.id;
    const userName = req.user.name;

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

    // Check if product exists
    const product = await Product.findOne({ product_id: productId });
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Create review
    const review = new Review({
      product_id: productId,
      user_id: userId,
      user_name: userName,
      rating,
      comment
    });

    await review.save();

    // Update product's average rating
    await updateProductRating(productId);

    res.status(201).json({
      success: true,
      message: 'Review submitted successfully',
      data: review
    });
  } catch (error) {
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

// Update product rating (helper function)
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
    
    await Product.findOneAndUpdate(
      { product_id: productId },
      { 
        rating: Math.round(avgRating * 10) / 10, // Round to 1 decimal
        review_count: totalReviews
      }
    );
  } catch (error) {
    console.error('Error updating product rating:', error);
  }
};

module.exports = {
  getProductReviews,
  createReview,
  getUserReview
};