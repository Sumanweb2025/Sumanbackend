// const UserBehavior = require('../Models/userBehavior.model');
// const Recommendation = require('../Models/recommendation.model');
// const recommendationEngine = require('../Services/recommendationEngine');
// const { v4: uuidv4 } = require('uuid');

// // Track user behavior
// const trackBehavior = async (req, res) => {
//   try {
//     const { userId } = req.user;
//     const { 
//       action, 
//       productId, 
//       sessionId, 
//       viewDuration, 
//       source, 
//       quantity, 
//       searchQuery, 
//       resultsCount, 
//       clickedProducts,
//       deviceInfo 
//     } = req.body;

//     let userBehavior = await UserBehavior.findOne({ userId, sessionId });
    
//     if (!userBehavior) {
//       userBehavior = new UserBehavior({
//         userId,
//         sessionId: sessionId || uuidv4(),
//         deviceInfo: deviceInfo || {}
//       });
//     }

//     // Get product data for preference updates
//     const product = recommendationEngine.getProductById(productId);

//     switch (action) {
//       case 'product_view':
//         userBehavior.addProductView(productId, viewDuration, source);
//         if (product) {
//           userBehavior.updateCategoryPreference(product.category, product.sub_category);
//           userBehavior.updateBrandPreference(product.brand);
//           userBehavior.updatePricePreference(parseFloat(product.price));
//         }
//         break;

//       case 'add_to_cart':
//         userBehavior.addCartAction(productId, 'add', quantity);
//         if (product) {
//           userBehavior.updateCategoryPreference(product.category, product.sub_category);
//           userBehavior.updateBrandPreference(product.brand);
//         }
//         break;

//       case 'remove_from_cart':
//         userBehavior.addCartAction(productId, 'remove', quantity);
//         break;

//       case 'add_to_wishlist':
//         userBehavior.addWishlistAction(productId, 'add');
//         if (product) {
//           userBehavior.updateCategoryPreference(product.category, product.sub_category);
//           userBehavior.updateBrandPreference(product.brand);
//         }
//         break;

//       case 'remove_from_wishlist':
//         userBehavior.addWishlistAction(productId, 'remove');
//         break;

//       case 'search':
//         userBehavior.searchQueries.push({
//           query: searchQuery,
//           searchedAt: new Date(),
//           resultsCount,
//           clickedProducts: clickedProducts || []
//         });
//         // Keep only last 20 searches
//         if (userBehavior.searchQueries.length > 20) {
//           userBehavior.searchQueries = userBehavior.searchQueries.slice(-20);
//         }
//         break;

//       case 'purchase':
//         userBehavior.purchases.push({
//           productId,
//           quantity: quantity || 1,
//           price: product ? parseFloat(product.price) : 0,
//           purchasedAt: new Date()
//         });
//         if (product) {
//           userBehavior.updateCategoryPreference(product.category, product.sub_category);
//           userBehavior.updateBrandPreference(product.brand);
//           userBehavior.updatePricePreference(parseFloat(product.price));
//         }
//         break;

//       default:
//         return res.status(400).json({
//           success: false,
//           message: 'Invalid action type'
//         });
//     }

//     await userBehavior.save();

//     // Update recommendations asynchronously (don't wait)
//     if (['product_view', 'add_to_cart', 'add_to_wishlist', 'purchase'].includes(action)) {
//       recommendationEngine.updateUserRecommendations(userId).catch(console.error);
//     }

//     res.status(200).json({
//       success: true,
//       message: 'Behavior tracked successfully',
//       data: {
//         sessionId: userBehavior.sessionId
//       }
//     });

//   } catch (error) {
//     console.error('Error tracking behavior:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Error tracking user behavior',
//       error: error.message
//     });
//   }
// };

// // Get personalized recommendations
// const getPersonalizedRecommendations = async (req, res) => {
//   try {
//     const { userId } = req.user;
//     const { type = 'personalized', limit = 12 } = req.query;

//     const recommendations = await recommendationEngine.getRecommendationsForUser(
//       userId, 
//       type, 
//       parseInt(limit)
//     );

//     // Get full product details for recommendations
//     const recommendationsWithDetails = recommendations.map(rec => {
//       const product = recommendationEngine.getProductById(rec.productId);
//       return {
//         ...rec,
//         product: product || null
//       };
//     }).filter(rec => rec.product !== null);

//     res.status(200).json({
//       success: true,
//       message: 'Recommendations retrieved successfully',
//       data: {
//         recommendations: recommendationsWithDetails,
//         type,
//         totalCount: recommendationsWithDetails.length
//       }
//     });

//   } catch (error) {
//     console.error('Error getting recommendations:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Error retrieving recommendations',
//       error: error.message
//     });
//   }
// };

// // Get similar products
// const getSimilarProducts = async (req, res) => {
//   try {
//     const { productId } = req.params;
//     const { limit = 8 } = req.query;

//     const similarProducts = await recommendationEngine.generateSimilarProducts(
//       productId, 
//       parseInt(limit)
//     );

//     // Get full product details
//     const similarProductsWithDetails = similarProducts.map(sim => {
//       const product = recommendationEngine.getProductById(sim.productId);
//       return {
//         ...sim,
//         product: product || null
//       };
//     }).filter(sim => sim.product !== null);

//     res.status(200).json({
//       success: true,
//       message: 'Similar products retrieved successfully',
//       data: {
//         baseProductId: productId,
//         similarProducts: similarProductsWithDetails,
//         totalCount: similarProductsWithDetails.length
//       }
//     });

//   } catch (error) {
//     console.error('Error getting similar products:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Error retrieving similar products',
//       error: error.message
//     });
//   }
// };

// // Get frequently bought together
// const getFrequentlyBoughtTogether = async (req, res) => {
//   try {
//     const { productId } = req.params;
//     const { limit = 4 } = req.query;

//     const companions = await recommendationEngine.generateFrequentlyBoughtTogether(
//       productId, 
//       parseInt(limit)
//     );

//     // Get full product details
//     const companionsWithDetails = companions.map(comp => {
//       const product = recommendationEngine.getProductById(comp.productId);
//       return {
//         ...comp,
//         product: product || null
//       };
//     }).filter(comp => comp.product !== null);

//     res.status(200).json({
//       success: true,
//       message: 'Frequently bought together retrieved successfully',
//       data: {
//         baseProductId: productId,
//         companions: companionsWithDetails,
//         totalCount: companionsWithDetails.length
//       }
//     });

//   } catch (error) {
//     console.error('Error getting frequently bought together:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Error retrieving frequently bought together',
//       error: error.message
//     });
//   }
// };

// // Track recommendation interaction
// const trackRecommendationInteraction = async (req, res) => {
//   try {
//     const { userId } = req.user;
//     const { 
//       recommendationType, 
//       recommendedProductId, 
//       clicked = false,
//       purchased = false 
//     } = req.body;

//     let userBehavior = await UserBehavior.findOne({ userId });
    
//     if (!userBehavior) {
//       return res.status(404).json({
//         success: false,
//         message: 'User behavior not found'
//       });
//     }

//     // Track recommendation interaction
//     userBehavior.recommendationInteractions.push({
//       recommendationType,
//       recommendedProductId,
//       clicked,
//       interactionAt: new Date()
//     });

//     // Keep only last 50 interactions
//     if (userBehavior.recommendationInteractions.length > 50) {
//       userBehavior.recommendationInteractions = userBehavior.recommendationInteractions.slice(-50);
//     }

//     await userBehavior.save();

//     // Update recommendation performance metrics
//     let userRecommendation = await Recommendation.findOne({ userId });
//     if (userRecommendation) {
//       userRecommendation.updatePerformanceMetrics(
//         1, // shown
//         clicked ? 1 : 0, // clicks
//         purchased ? 1 : 0 // purchases
//       );
//       await userRecommendation.save();
//     }

//     res.status(200).json({
//       success: true,
//       message: 'Recommendation interaction tracked successfully'
//     });

//   } catch (error) {
//     console.error('Error tracking recommendation interaction:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Error tracking recommendation interaction',
//       error: error.message
//     });
//   }
// };

// // Get user behavior analytics
// const getUserBehaviorAnalytics = async (req, res) => {
//   try {
//     const { userId } = req.user;

//     const userBehavior = await UserBehavior.findOne({ userId });
    
//     if (!userBehavior) {
//       return res.status(404).json({
//         success: false,
//         message: 'User behavior data not found'
//       });
//     }

//     const analytics = {
//       totalProductViews: userBehavior.productViews.length,
//       totalSearches: userBehavior.searchQueries.length,
//       totalCartActions: userBehavior.cartActions.length,
//       totalWishlistActions: userBehavior.wishlistActions.length,
//       totalPurchases: userBehavior.purchases.length,
//       topCategories: userBehavior.categoryPreferences
//         .sort((a, b) => b.preferenceScore - a.preferenceScore)
//         .slice(0, 5),
//       topBrands: userBehavior.brandPreferences
//         .sort((a, b) => b.preferenceScore - a.preferenceScore)
//         .slice(0, 5),
//       priceRange: userBehavior.priceRangePreferences,
//       recentActivity: {
//         recentViews: userBehavior.productViews.slice(-10),
//         recentSearches: userBehavior.searchQueries.slice(-5),
//         recentPurchases: userBehavior.purchases.slice(-5)
//       }
//     };

//     res.status(200).json({
//       success: true,
//       message: 'User behavior analytics retrieved successfully',
//       data: analytics
//     });

//   } catch (error) {
//     console.error('Error getting user behavior analytics:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Error retrieving user behavior analytics',
//       error: error.message
//     });
//   }
// };

// // Get trending products
// const getTrendingProducts = async (req, res) => {
//   try {
//     const { limit = 12, category, timeframe = 'weekly' } = req.query;

//     const trendingRecommendations = await recommendationEngine.generateTrendingRecommendations(
//       parseInt(limit)
//     );

//     // Get full product details
//     const trendingWithDetails = trendingRecommendations.map(trend => {
//       const product = recommendationEngine.getProductById(trend.productId);
//       return {
//         ...trend,
//         product: product || null
//       };
//     }).filter(trend => trend.product !== null);

//     // Filter by category if specified
//     const filteredTrending = category 
//       ? trendingWithDetails.filter(trend => trend.product.category === category)
//       : trendingWithDetails;

//     res.status(200).json({
//       success: true,
//       message: 'Trending products retrieved successfully',
//       data: {
//         trending: filteredTrending,
//         timeframe,
//         category: category || 'all',
//         totalCount: filteredTrending.length
//       }
//     });

//   } catch (error) {
//     console.error('Error getting trending products:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Error retrieving trending products',
//       error: error.message
//     });
//   }
// };

// module.exports = {
//   trackBehavior,
//   getPersonalizedRecommendations,
//   getSimilarProducts,
//   getFrequentlyBoughtTogether,
//   trackRecommendationInteraction,
//   getUserBehaviorAnalytics,
//   getTrendingProducts
// };
