const express = require("express");
const router = express.Router();
const authRouter= require("./auth.router");
const dataRouter= require("./data.router");
const productRoutes = require("./product.router");
const cartRoutes = require("./cart.router");
const wishlistRoutes = require("./wishlist.router");
const orderRoutes = require("./order.router");
const Reviewrouter = require("./Review.router");
const offerRouter = require("./offer.router");
const PaymentRouter = require("./payment.router")

//const testimonialRoutes = require("./testimonial.router");

router.use("/api/auth", authRouter);
router.use("/api", dataRouter);
router.use('/api/products', productRoutes);
router.use('/api/cart', cartRoutes);
router.use('/api/wishlist', wishlistRoutes);
router.use('/api/orders', orderRoutes);
router.use("/api/reviews", Reviewrouter);
router.use("/api/offers", offerRouter);
router.use("/api/payments", PaymentRouter);

//router.use("/api/testimonials", testimonialRoutes);

module.exports = router;