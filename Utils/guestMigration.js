const Cart = require('../Models/cart.model');
const Wishlist = require('../Models/wishlist.model');
const User = require('../Models/user.model');

/**
 * Migrate guest cart and wishlist to logged-in user account
 * Call this after successful login/signup
 */
const migrateGuestDataToUser = async (userId, sessionId) => {
  try {
    if (!sessionId) {
      console.log('No session ID provided, skipping migration');
      return {
        success: true,
        message: 'No guest data to migrate'
      };
    }

    console.log(`Starting migration for sessionId: ${sessionId} to userId: ${userId}`);

    // Migrate Cart
    const guestCart = await Cart.findOne({ sessionId, isGuest: true });
    const userCart = await Cart.findOne({ userId });

    if (guestCart && guestCart.items.length > 0) {
      if (!userCart) {
        // No existing user cart, convert guest cart to user cart
        guestCart.userId = userId;
        guestCart.sessionId = undefined;
        guestCart.isGuest = false;
        await guestCart.save();
        
        // Update user document cart array
        const user = await User.findById(userId);
        user.cart = guestCart.items.map(item => ({
          product: item.productId,
          quantity: item.quantity
        }));
        await user.save();
        
        console.log('Guest cart converted to user cart');
      } else {
        // Merge guest cart items into existing user cart
        for (const guestItem of guestCart.items) {
          const existingItemIndex = userCart.items.findIndex(
            item => item.productId.toString() === guestItem.productId.toString()
          );

          if (existingItemIndex > -1) {
            // Product exists, add quantities
            userCart.items[existingItemIndex].quantity += guestItem.quantity;
          } else {
            // New product, add to cart
            userCart.items.push(guestItem);
          }
        }

        await userCart.save();

        // Update user document
        const user = await User.findById(userId);
        for (const item of userCart.items) {
          const existingCartItem = user.cart.find(
            cartItem => cartItem.product.toString() === item.productId.toString()
          );
          
          if (existingCartItem) {
            existingCartItem.quantity = item.quantity;
          } else {
            user.cart.push({
              product: item.productId,
              quantity: item.quantity
            });
          }
        }
        await user.save();

        // Delete guest cart
        await Cart.deleteOne({ sessionId, isGuest: true });
        console.log('Guest cart merged with user cart');
      }
    }

    // Migrate Wishlist
    const guestWishlist = await Wishlist.findOne({ sessionId, isGuest: true });
    const userWishlist = await Wishlist.findOne({ userId });

    if (guestWishlist && guestWishlist.products.length > 0) {
      if (!userWishlist) {
        // No existing user wishlist, convert guest wishlist
        guestWishlist.userId = userId;
        guestWishlist.sessionId = undefined;
        guestWishlist.isGuest = false;
        await guestWishlist.save();

        // Update user document
        const user = await User.findById(userId);
        user.wishlist = guestWishlist.products.map(item => item.productId);
        await user.save();

        console.log('Guest wishlist converted to user wishlist');
      } else {
        // Merge guest wishlist into existing user wishlist
        for (const guestProduct of guestWishlist.products) {
          const exists = userWishlist.products.find(
            item => item.productId.toString() === guestProduct.productId.toString()
          );

          if (!exists) {
            userWishlist.products.push(guestProduct);
          }
        }

        await userWishlist.save();

        // Update user document
        const user = await User.findById(userId);
        for (const item of userWishlist.products) {
          if (!user.wishlist.includes(item.productId)) {
            user.wishlist.push(item.productId);
          }
        }
        await user.save();

        // Delete guest wishlist
        await Wishlist.deleteOne({ sessionId, isGuest: true });
        console.log('Guest wishlist merged with user wishlist');
      }
    }

    return {
      success: true,
      message: 'Guest data migrated successfully',
      migratedCart: !!guestCart,
      migratedWishlist: !!guestWishlist
    };

  } catch (error) {
    console.error('Error migrating guest data:', error);
    return {
      success: false,
      message: 'Error migrating guest data',
      error: error.message
    };
  }
};

/**
 * Clean up expired guest data
 * Run this as a cron job daily
 */
const cleanupExpiredGuestData = async () => {
  try {
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() - 7); // 7 days old

    // Delete expired guest carts
    const cartResult = await Cart.deleteMany({
      isGuest: true,
      updatedAt: { $lt: expiryDate }
    });

    // Delete expired guest wishlists
    const wishlistResult = await Wishlist.deleteMany({
      isGuest: true,
      updatedAt: { $lt: expiryDate }
    });

    console.log(`Cleanup completed: ${cartResult.deletedCount} carts, ${wishlistResult.deletedCount} wishlists deleted`);

    return {
      success: true,
      cartsDeleted: cartResult.deletedCount,
      wishlistsDeleted: wishlistResult.deletedCount
    };
  } catch (error) {
    console.error('Error cleaning up guest data:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

module.exports = {
  migrateGuestDataToUser,
  cleanupExpiredGuestData
};