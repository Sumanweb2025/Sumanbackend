const Coupon = require('../Models/coupon.model');

// Get all coupons (for admin)
exports.getAllCoupons = async (req, res) => {
  try {
    const coupons = await Coupon.find()
      .populate('applicableProducts', 'name price')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: coupons.length,
      data: coupons
    });
  } catch (error) {
    console.error('Error fetching coupons:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching coupons'
    });
  }
};

// Get single coupon by ID
exports.getCouponById = async (req, res) => {
  try {
    const coupon = await Coupon.findById(req.params.id)
      .populate('applicableProducts', 'name price');

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: 'Coupon not found'
      });
    }

    res.status(200).json({
      success: true,
      data: coupon
    });
  } catch (error) {
    console.error('Error fetching coupon:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching coupon'
    });
  }
};

// Create new coupon
exports.createCoupon = async (req, res) => {
  try {
    const {
      code,
      description,
      discountType,
      discountValue,
      minimumOrderAmount,
      maximumDiscountAmount,
      validFrom,
      validUntil,
      usageLimit,
      isActive,
      applicableProducts,
      applicableCategories,
      userUsageLimit
    } = req.body;

    // Validate required fields
    if (!code || !description || !discountType || !discountValue || !validFrom || !validUntil) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields'
      });
    }

    // Check if coupon code already exists
    const existingCoupon = await Coupon.findOne({ code: code.toUpperCase() });
    if (existingCoupon) {
      return res.status(400).json({
        success: false,
        message: 'Coupon code already exists'
      });
    }

    // Create new coupon
    const coupon = await Coupon.create({
      code: code.toUpperCase(),
      description,
      discountType,
      discountValue,
      minimumOrderAmount: minimumOrderAmount || 0,
      maximumDiscountAmount: maximumDiscountAmount || null,
      validFrom,
      validUntil,
      usageLimit: usageLimit || null,
      isActive: isActive !== undefined ? isActive : true,
      applicableProducts: applicableProducts || [],
      applicableCategories: applicableCategories || [],
      userUsageLimit: userUsageLimit || 1
    });

    res.status(201).json({
      success: true,
      message: 'Coupon created successfully',
      data: coupon
    });
  } catch (error) {
    console.error('Error creating coupon:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating coupon'
    });
  }
};

// Update coupon
exports.updateCoupon = async (req, res) => {
  try {
    const coupon = await Coupon.findById(req.params.id);

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: 'Coupon not found'
      });
    }

    // If code is being updated, check if new code already exists
    if (req.body.code && req.body.code.toUpperCase() !== coupon.code) {
      const existingCoupon = await Coupon.findOne({
        code: req.body.code.toUpperCase(),
        _id: { $ne: req.params.id }
      });

      if (existingCoupon) {
        return res.status(400).json({
          success: false,
          message: 'Coupon code already exists'
        });
      }
      req.body.code = req.body.code.toUpperCase();
    }

    // Update coupon
    const updatedCoupon = await Coupon.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: 'Coupon updated successfully',
      data: updatedCoupon
    });
  } catch (error) {
    console.error('Error updating coupon:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating coupon'
    });
  }
};

// Delete coupon
exports.deleteCoupon = async (req, res) => {
  try {
    const coupon = await Coupon.findById(req.params.id);

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: 'Coupon not found'
      });
    }

    await Coupon.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Coupon deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting coupon:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting coupon'
    });
  }
};

// Toggle coupon active status
exports.toggleCouponStatus = async (req, res) => {
  try {
    const coupon = await Coupon.findById(req.params.id);

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: 'Coupon not found'
      });
    }

    coupon.isActive = !coupon.isActive;
    await coupon.save();

    res.status(200).json({
      success: true,
      message: `Coupon ${coupon.isActive ? 'activated' : 'deactivated'} successfully`,
      data: coupon
    });
  } catch (error) {
    console.error('Error toggling coupon status:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while toggling coupon status'
    });
  }
};

// Get coupon statistics
exports.getCouponStats = async (req, res) => {
  try {
    const totalCoupons = await Coupon.countDocuments();
    const activeCoupons = await Coupon.countDocuments({ isActive: true });
    const expiredCoupons = await Coupon.countDocuments({
      validUntil: { $lt: new Date() }
    });

    const mostUsedCoupons = await Coupon.find()
      .sort({ usedCount: -1 })
      .limit(5)
      .select('code description usedCount usageLimit');

    res.status(200).json({
      success: true,
      data: {
        totalCoupons,
        activeCoupons,
        expiredCoupons,
        mostUsedCoupons
      }
    });
  } catch (error) {
    console.error('Error fetching coupon stats:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching coupon statistics'
    });
  }
};
