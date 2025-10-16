// const mongoose = require('mongoose');

// // Product Recommendation Schema
// const recommendationSchema = new mongoose.Schema({
//   userId: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'User',
//     required: true
//   },
  
//   // Personalized Recommendations
//   personalizedRecommendations: [{
//     productId: String,
//     score: {
//       type: Number,
//       min: 0,
//       max: 10,
//       default: 0
//     },
//     reasons: [{
//       type: String,
//       enum: [
//         'frequently_viewed',
//         'similar_to_purchased',
//         'same_category',
//         'same_brand',
//         'price_range_match',
//         'trending_in_category',
//         'frequently_bought_together',
//         'similar_users_liked',
//         'back_in_stock',
//         'seasonal_trending'
//       ]
//     }],
//     generatedAt: {
//       type: Date,
//       default: Date.now
//     }
//   }],
  
//   // Similar Products (for product detail pages)
//   similarProducts: [{
//     forProductId: String,
//     recommendations: [{
//       productId: String,
//       similarityScore: {
//         type: Number,
//         min: 0,
//         max: 1,
//         default: 0
//       },
//       similarityFactors: [{
//         factor: {
//           type: String,
//           enum: ['category', 'brand', 'price', 'ingredients', 'rating', 'description']
//         },
//         weight: Number
//       }]
//     }],
//     lastUpdated: {
//       type: Date,
//       default: Date.now
//     }
//   }],
  
//   // Frequently Bought Together
//   frequentlyBoughtTogether: [{
//     baseProductId: String,
//     companionProducts: [{
//       productId: String,
//       confidence: {
//         type: Number,
//         min: 0,
//         max: 1,
//         default: 0
//       },
//       frequency: Number
//     }],
//     lastUpdated: {
//       type: Date,
//       default: Date.now
//     }
//   }],
  
//   // Category-based Recommendations
//   categoryRecommendations: [{
//     category: String,
//     subCategory: String,
//     products: [{
//       productId: String,
//       score: Number,
//       reason: String
//     }],
//     lastUpdated: {
//       type: Date,
//       default: Date.now
//     }
//   }],
  
//   // Trending Products
//   trendingProducts: [{
//     productId: String,
//     trendScore: Number,
//     timeframe: {
//       type: String,
//       enum: ['daily', 'weekly', 'monthly'],
//       default: 'weekly'
//     },
//     lastUpdated: {
//       type: Date,
//       default: Date.now
//     }
//   }],
  
//   // Recommendation Performance Tracking
//   performanceMetrics: {
//     totalRecommendationsShown: {
//       type: Number,
//       default: 0
//     },
//     totalClicks: {
//       type: Number,
//       default: 0
//     },
//     totalPurchases: {
//       type: Number,
//       default: 0
//     },
//     clickThroughRate: {
//       type: Number,
//       default: 0
//     },
//     conversionRate: {
//       type: Number,
//       default: 0
//     },
//     lastCalculated: {
//       type: Date,
//       default: Date.now
//     }
//   }
// }, {
//   timestamps: true
// });

// // Indexes for performance
// recommendationSchema.index({ userId: 1 });
// recommendationSchema.index({ 'personalizedRecommendations.productId': 1 });
// recommendationSchema.index({ 'similarProducts.forProductId': 1 });
// recommendationSchema.index({ 'frequentlyBoughtTogether.baseProductId': 1 });
// recommendationSchema.index({ 'categoryRecommendations.category': 1 });
// recommendationSchema.index({ updatedAt: -1 });

// // Methods for updating recommendations
// recommendationSchema.methods.updatePersonalizedRecommendations = function(recommendations) {
//   this.personalizedRecommendations = recommendations.map(rec => ({
//     ...rec,
//     generatedAt: new Date()
//   }));
// };

// recommendationSchema.methods.addSimilarProducts = function(forProductId, similarProducts) {
//   const existingIndex = this.similarProducts.findIndex(sp => sp.forProductId === forProductId);
  
//   const similarProductData = {
//     forProductId,
//     recommendations: similarProducts,
//     lastUpdated: new Date()
//   };
  
//   if (existingIndex >= 0) {
//     this.similarProducts[existingIndex] = similarProductData;
//   } else {
//     this.similarProducts.push(similarProductData);
//   }
  
//   // Keep only last 50 similar product sets
//   if (this.similarProducts.length > 50) {
//     this.similarProducts = this.similarProducts.slice(-50);
//   }
// };

// recommendationSchema.methods.updateFrequentlyBoughtTogether = function(baseProductId, companions) {
//   const existingIndex = this.frequentlyBoughtTogether.findIndex(fbt => fbt.baseProductId === baseProductId);
  
//   const fbtData = {
//     baseProductId,
//     companionProducts: companions,
//     lastUpdated: new Date()
//   };
  
//   if (existingIndex >= 0) {
//     this.frequentlyBoughtTogether[existingIndex] = fbtData;
//   } else {
//     this.frequentlyBoughtTogether.push(fbtData);
//   }
  
//   // Keep only last 30 FBT sets
//   if (this.frequentlyBoughtTogether.length > 30) {
//     this.frequentlyBoughtTogether = this.frequentlyBoughtTogether.slice(-30);
//   }
// };

// recommendationSchema.methods.updatePerformanceMetrics = function(shown, clicks, purchases) {
//   const metrics = this.performanceMetrics;
  
//   metrics.totalRecommendationsShown += shown || 0;
//   metrics.totalClicks += clicks || 0;
//   metrics.totalPurchases += purchases || 0;
  
//   // Calculate rates
//   if (metrics.totalRecommendationsShown > 0) {
//     metrics.clickThroughRate = (metrics.totalClicks / metrics.totalRecommendationsShown) * 100;
//   }
  
//   if (metrics.totalClicks > 0) {
//     metrics.conversionRate = (metrics.totalPurchases / metrics.totalClicks) * 100;
//   }
  
//   metrics.lastCalculated = new Date();
// };

// // Static methods for analytics
// recommendationSchema.statics.getTopPerformingRecommendations = function(limit = 10) {
//   return this.aggregate([
//     { $unwind: '$personalizedRecommendations' },
//     {
//       $group: {
//         _id: '$personalizedRecommendations.productId',
//         avgScore: { $avg: '$personalizedRecommendations.score' },
//         frequency: { $sum: 1 }
//       }
//     },
//     { $sort: { avgScore: -1, frequency: -1 } },
//     { $limit: limit }
//   ]);
// };

// recommendationSchema.statics.getRecommendationStats = function() {
//   return this.aggregate([
//     {
//       $group: {
//         _id: null,
//         totalUsers: { $sum: 1 },
//         avgClickThroughRate: { $avg: '$performanceMetrics.clickThroughRate' },
//         avgConversionRate: { $avg: '$performanceMetrics.conversionRate' },
//         totalRecommendationsShown: { $sum: '$performanceMetrics.totalRecommendationsShown' },
//         totalClicks: { $sum: '$performanceMetrics.totalClicks' },
//         totalPurchases: { $sum: '$performanceMetrics.totalPurchases' }
//       }
//     }
//   ]);
// };

// module.exports = mongoose.model('Recommendation', recommendationSchema);
