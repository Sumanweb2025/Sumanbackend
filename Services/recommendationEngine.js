// const UserBehavior = require('../Models/userBehavior.model');
// const Recommendation = require('../Models/recommendation.model');
// const fs = require('fs').promises;
// const path = require('path');

// class RecommendationEngine {
//   constructor() {
//     this.productData = null;
//     this.loadProductData();
//   }

//   // Load product data from JSON file
//   async loadProductData() {
//     try {
//       const dataPath = path.join(__dirname, '../Data/website_data.json');
//       const data = await fs.readFile(dataPath, 'utf8');
//       this.productData = JSON.parse(data);
//       console.log(`Loaded ${this.productData.length} products for recommendation engine`);
//     } catch (error) {
//       console.error('Error loading product data:', error);
//       this.productData = [];
//     }
//   }

//   // Get product by ID
//   getProductById(productId) {
//     return this.productData?.find(product => product.product_id === productId);
//   }

//   // Calculate similarity between two products
//   calculateProductSimilarity(product1, product2) {
//     if (!product1 || !product2) return 0;

//     let similarity = 0;
//     let factors = [];

//     // Category similarity (40% weight)
//     if (product1.category === product2.category) {
//       similarity += 0.4;
//       factors.push({ factor: 'category', weight: 0.4 });
      
//       // Sub-category bonus
//       if (product1.sub_category === product2.sub_category) {
//         similarity += 0.1;
//       }
//     }

//     // Brand similarity (25% weight)
//     if (product1.brand === product2.brand) {
//       similarity += 0.25;
//       factors.push({ factor: 'brand', weight: 0.25 });
//     }

//     // Price similarity (15% weight)
//     const price1 = parseFloat(product1.price) || 0;
//     const price2 = parseFloat(product2.price) || 0;
//     if (price1 > 0 && price2 > 0) {
//       const priceDiff = Math.abs(price1 - price2);
//       const avgPrice = (price1 + price2) / 2;
//       const priceSimScore = Math.max(0, 1 - (priceDiff / avgPrice));
//       similarity += priceSimScore * 0.15;
//       factors.push({ factor: 'price', weight: 0.15 });
//     }

//     // Rating similarity (10% weight)
//     const rating1 = parseFloat(product1.rating) || 0;
//     const rating2 = parseFloat(product2.rating) || 0;
//     if (rating1 > 0 && rating2 > 0) {
//       const ratingDiff = Math.abs(rating1 - rating2);
//       const ratingSimScore = Math.max(0, 1 - (ratingDiff / 5));
//       similarity += ratingSimScore * 0.1;
//       factors.push({ factor: 'rating', weight: 0.1 });
//     }

//     // Description/ingredients similarity (10% weight)
//     if (product1.description && product2.description) {
//       const desc1Words = product1.description.toLowerCase().split(/\s+/);
//       const desc2Words = product2.description.toLowerCase().split(/\s+/);
//       const commonWords = desc1Words.filter(word => desc2Words.includes(word));
//       const descSimScore = commonWords.length / Math.max(desc1Words.length, desc2Words.length);
//       similarity += descSimScore * 0.1;
//       factors.push({ factor: 'description', weight: 0.1 });
//     }

//     return { similarity: Math.min(similarity, 1), factors };
//   }

//   // Generate similar products for a given product
//   async generateSimilarProducts(productId, limit = 8) {
//     const targetProduct = this.getProductById(productId);
//     if (!targetProduct) return [];

//     const similarities = [];

//     for (const product of this.productData) {
//       if (product.product_id === productId) continue;

//       const { similarity, factors } = this.calculateProductSimilarity(targetProduct, product);
      
//       if (similarity > 0.3) { // Only include products with decent similarity
//         similarities.push({
//           productId: product.product_id,
//           similarityScore: similarity,
//           similarityFactors: factors
//         });
//       }
//     }

//     // Sort by similarity and return top results
//     return similarities
//       .sort((a, b) => b.similarityScore - a.similarityScore)
//       .slice(0, limit);
//   }

//   // Generate personalized recommendations based on user behavior
//   async generatePersonalizedRecommendations(userId, limit = 12) {
//     try {
//       const userBehavior = await UserBehavior.findOne({ userId }).lean();
//       if (!userBehavior) {
//         return this.generateTrendingRecommendations(limit);
//       }

//       const recommendations = [];
//       const viewedProductIds = new Set();
//       const purchasedProductIds = new Set();

//       // Collect viewed and purchased products
//       userBehavior.productViews?.forEach(view => viewedProductIds.add(view.productId));
//       userBehavior.purchases?.forEach(purchase => purchasedProductIds.add(purchase.productId));

//       // Score products based on user preferences
//       for (const product of this.productData) {
//         if (viewedProductIds.has(product.product_id) || purchasedProductIds.has(product.product_id)) {
//           continue; // Skip already interacted products
//         }

//         let score = 0;
//         let reasons = [];

//         // Category preference scoring
//         const categoryPref = userBehavior.categoryPreferences?.find(pref => 
//           pref.category === product.category
//         );
//         if (categoryPref) {
//           score += categoryPref.preferenceScore * 0.3;
//           reasons.push('same_category');
//         }

//         // Brand preference scoring
//         const brandPref = userBehavior.brandPreferences?.find(pref => 
//           pref.brand === product.brand
//         );
//         if (brandPref) {
//           score += brandPref.preferenceScore * 0.25;
//           reasons.push('same_brand');
//         }

//         // Price range preference
//         const productPrice = parseFloat(product.price) || 0;
//         const pricePrefs = userBehavior.priceRangePreferences;
//         if (pricePrefs && productPrice >= pricePrefs.minPrice && productPrice <= pricePrefs.maxPrice) {
//           score += 2;
//           reasons.push('price_range_match');
//         }

//         // Rating bonus
//         const rating = parseFloat(product.rating) || 0;
//         if (rating >= 4) {
//           score += 1;
//         }

//         // Similar to purchased products
//         for (const purchaseProductId of purchasedProductIds) {
//           const purchasedProduct = this.getProductById(purchaseProductId);
//           if (purchasedProduct) {
//             const { similarity } = this.calculateProductSimilarity(product, purchasedProduct);
//             if (similarity > 0.5) {
//               score += similarity * 2;
//               reasons.push('similar_to_purchased');
//               break;
//             }
//           }
//         }

//         if (score > 0) {
//           recommendations.push({
//             productId: product.product_id,
//             score: Math.min(score, 10),
//             reasons: [...new Set(reasons)] // Remove duplicates
//           });
//         }
//       }

//       // Sort by score and return top recommendations
//       return recommendations
//         .sort((a, b) => b.score - a.score)
//         .slice(0, limit);

//     } catch (error) {
//       console.error('Error generating personalized recommendations:', error);
//       return this.generateTrendingRecommendations(limit);
//     }
//   }

//   // Generate trending recommendations (fallback)
//   async generateTrendingRecommendations(limit = 12) {
//     try {
//       // Get most viewed products from user behavior
//       const mostViewed = await UserBehavior.getMostViewedProducts(limit * 2);
//       const viewedProductIds = mostViewed.map(item => item._id);

//       const trendingProducts = [];

//       // Add highly rated products if not enough trending data
//       const highRatedProducts = this.productData
//         .filter(product => {
//           const rating = parseFloat(product.rating) || 0;
//           return rating >= 4.0 && !viewedProductIds.includes(product.product_id);
//         })
//         .sort((a, b) => parseFloat(b.rating) - parseFloat(a.rating))
//         .slice(0, limit);

//       // Combine trending and high-rated products
//       for (const viewedProduct of mostViewed) {
//         const product = this.getProductById(viewedProduct._id);
//         if (product) {
//           trendingProducts.push({
//             productId: product.product_id,
//             score: Math.min(viewedProduct.viewCount * 0.1, 10),
//             reasons: ['trending_in_category']
//           });
//         }
//       }

//       // Fill remaining slots with high-rated products
//       for (const product of highRatedProducts) {
//         if (trendingProducts.length >= limit) break;
//         if (!trendingProducts.find(tp => tp.productId === product.product_id)) {
//           trendingProducts.push({
//             productId: product.product_id,
//             score: parseFloat(product.rating) || 0,
//             reasons: ['highly_rated']
//           });
//         }
//       }

//       return trendingProducts.slice(0, limit);

//     } catch (error) {
//       console.error('Error generating trending recommendations:', error);
//       return [];
//     }
//   }

//   // Generate frequently bought together recommendations
//   async generateFrequentlyBoughtTogether(productId, limit = 4) {
//     try {
//       // Find orders containing this product
//       const companionProducts = new Map();

//       // This would typically query your Order model
//       // For now, we'll use category-based suggestions
//       const targetProduct = this.getProductById(productId);
//       if (!targetProduct) return [];

//       const sameCategory = this.productData
//         .filter(product => 
//           product.product_id !== productId &&
//           product.category === targetProduct.category &&
//           product.sub_category === targetProduct.sub_category
//         )
//         .slice(0, limit);

//       return sameCategory.map(product => ({
//         productId: product.product_id,
//         confidence: 0.7, // Default confidence
//         frequency: 1
//       }));

//     } catch (error) {
//       console.error('Error generating frequently bought together:', error);
//       return [];
//     }
//   }

//   // Update user recommendations
//   async updateUserRecommendations(userId) {
//     try {
//       let userRecommendation = await Recommendation.findOne({ userId });
      
//       if (!userRecommendation) {
//         userRecommendation = new Recommendation({ userId });
//       }

//       // Generate personalized recommendations
//       const personalizedRecs = await this.generatePersonalizedRecommendations(userId);
//       userRecommendation.updatePersonalizedRecommendations(personalizedRecs);

//       await userRecommendation.save();
//       return userRecommendation;

//     } catch (error) {
//       console.error('Error updating user recommendations:', error);
//       throw error;
//     }
//   }

//   // Get recommendations for user
//   async getRecommendationsForUser(userId, type = 'personalized', limit = 12) {
//     try {
//       const userRecommendation = await Recommendation.findOne({ userId });
      
//       if (!userRecommendation) {
//         // Generate fresh recommendations
//         await this.updateUserRecommendations(userId);
//         return this.getRecommendationsForUser(userId, type, limit);
//       }

//       switch (type) {
//         case 'personalized':
//           return userRecommendation.personalizedRecommendations
//             .sort((a, b) => b.score - a.score)
//             .slice(0, limit);
        
//         case 'trending':
//           return await this.generateTrendingRecommendations(limit);
        
//         default:
//           return userRecommendation.personalizedRecommendations
//             .sort((a, b) => b.score - a.score)
//             .slice(0, limit);
//       }

//     } catch (error) {
//       console.error('Error getting recommendations for user:', error);
//       return await this.generateTrendingRecommendations(limit);
//     }
//   }
// }

// module.exports = new RecommendationEngine();
