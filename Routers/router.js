const express = require("express");
const router = express.Router();
const authRouter= require("./auth.router");
const dataRouter= require("./data.router");
const productRoutes = require("./product.router");
const cartRoutes = require("./cart.router");
const wishlistRoutes = require("./wishlist.router");
const orderRoutes = require("./order.router");
const Reviewrouter = require("./Review.router");

router.use("/api", authRouter);
router.use("/api", dataRouter);
router.use('/api/products', productRoutes);
router.use('/api/cart', cartRoutes);
router.use('/api/Wishlist', wishlistRoutes);
router.use('/api/orders', orderRoutes);
router.use("/api/review", Reviewrouter);

module.exports = router;