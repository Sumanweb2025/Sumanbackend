// const Review = require('../Models/Review.model');
// const asyncHandler = require('express-async-handler');

// const addReview = asyncHandler(async (req, res) => {
//   const { productId, orderId, rating } = req.body;

//   // 1. Validate required fields
//   if (!productId || !orderId || !rating) {
//     res.status(400);
//     throw new Error('Product ID, Order ID and Rating are required');
//   }

//   // 2. Verify email exists (from middleware)
//   if (!req.user?.email) {
//     res.status(401);
//     throw new Error('User authentication invalid');
//   }

//   // 3. Check for existing review
//   const existingReview = await Review.findOne({
//     orderId,
//     userEmail: req.user.email
//   });

//   if (existingReview) {
//     res.status(400);
//     throw new Error('You have already reviewed this order');
//   }

//   // 4. Create review
//   const review = await Review.create({
//     productId,
//     orderId,
//     userEmail: req.user.email,
//     userName: req.user.name || 'Customer',
//     rating,
//     reviewText: req.body.reviewText || '',
//     images: req.body.images || []
//   });

//   res.status(201).json(review);
// });
// // @desc    Get reviews for a product
// // @route   GET /api/products/:productId/reviews
// // @access  Public
// const getProductReviews = asyncHandler(async (req, res) => {
//   const pageSize = 10;
//   const page = Number(req.query.pageNumber) || 1;

//   const count = await Review.countDocuments({ productId: req.params.productId });
//   const reviews = await Review.find({ productId: req.params.productId })
//     .sort({ createdAt: -1 })
//     .limit(pageSize)
//     .skip(pageSize * (page - 1));

//   res.json({
//     reviews,
//     page,
//     pages: Math.ceil(count / pageSize),
//     count
//   });
// });

// // @desc    Get average rating for a product
// // @route   GET /api/products/:productId/rating
// // @access  Public
// const getProductRating = asyncHandler(async (req, res) => {
//   const result = await Review.aggregate([
//     { $match: { productId: req.params.productId } }, // Changed for string productId
//     { 
//       $group: { 
//         _id: null, 
//         averageRating: { $avg: "$rating" }, 
//         count: { $sum: 1 } 
//       } 
//     }
//   ]);
  
//   res.json({
//     averageRating: result[0]?.averageRating.toFixed(1) || 0,
//     reviewCount: result[0]?.count || 0
//   });
// });

// // @desc    Delete a review
// // @route   DELETE /api/reviews/:id
// // @access  Private/Admin or Review Owner
// const deleteReview = asyncHandler(async (req, res) => {
//   const review = await Review.findById(req.params.id);

//   if (!review) {
//     res.status(404);
//     throw new Error('Review not found');
//   }

//   // Check if user is admin or review owner (by email)
//   if (review.userEmail !== req.user.email && !req.user.isAdmin) {
//     res.status(401);
//     throw new Error('Not authorized to delete this review');
//   }

//   await review.remove();
//   res.json({ message: 'Review removed' });
// });

// module.exports = {
//   addReview,
//   getProductReviews,
//   getProductRating,
//   deleteReview
// };