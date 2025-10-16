const Offer = require('../Models/offer.model');
const Product = require('../Models/product.model');

// Get active offer (for frontend)
exports.getActiveOffer = async (req, res) => {
  try {
    const now = new Date();

    const offer = await Offer.findOne({
      startDate: { $lte: now },
      endDate: { $gte: now },
      isActive: true
    })
      .populate('applicableProducts', 'product_id name price category brand gram')
      .sort({ createdAt: -1 });

    if (!offer) {
      return res.json({
        success: true,
        message: "No active offer.",
        data: null
      });
    }

    return res.json({
      success: true,
      data: offer
    });
  } catch (error) {
    console.error('Error fetching active offer:', error);
    res.status(500).json({
      success: false,
      message: "Server error."
    });
  }
};

// Get all offers (for admin)
exports.getAllOffers = async (req, res) => {
  try {
    const offers = await Offer.find()
      .populate('applicableProducts', 'product_id name price category brand gram')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: offers.length,
      data: offers
    });
  } catch (error) {
    console.error('Error fetching offers:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching offers'
    });
  }
};

// Get single offer by ID
exports.getOfferById = async (req, res) => {
  try {
    const offer = await Offer.findById(req.params.id);

    if (!offer) {
      return res.status(404).json({
        success: false,
        message: 'Offer not found'
      });
    }

    res.status(200).json({
      success: true,
      data: offer
    });
  } catch (error) {
    console.error('Error fetching offer:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching offer'
    });
  }
};

// Create new offer
exports.createOffer = async (req, res) => {
  try {
    const {
      title,
      description,
      discount,
      discountType,
      imageUrl,
      startDate,
      endDate,
      isActive,
      applicableCategories,
      applicableProducts,
      minimumOrderAmount
    } = req.body;

    // Validate required fields
    if (!title || !description || !discount || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields'
      });
    }

    // Validate dates
    if (new Date(endDate) <= new Date(startDate)) {
      return res.status(400).json({
        success: false,
        message: 'End date must be after start date'
      });
    }

    const newOffer = await Offer.create({
      title,
      description,
      discount,
      discountType: discountType || 'percentage',
      imageUrl: imageUrl || '',
      startDate,
      endDate,
      isActive: isActive !== undefined ? isActive : true,
      applicableCategories: applicableCategories || [],
      applicableProducts: applicableProducts || [],
      minimumOrderAmount: minimumOrderAmount || 0
    });

    // Populate products for response
    const populatedOffer = await Offer.findById(newOffer._id)
      .populate('applicableProducts', 'product_id name brand category price gram');

    res.status(201).json({
      success: true,
      message: 'Offer created successfully',
      data: populatedOffer
    });
  } catch (error) {
    console.error('Error creating offer:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// Update offer
exports.updateOffer = async (req, res) => {
  try {
    const offer = await Offer.findById(req.params.id);

    if (!offer) {
      return res.status(404).json({
        success: false,
        message: 'Offer not found'
      });
    }

    // Validate dates if they are being updated
    const startDate = req.body.startDate ? new Date(req.body.startDate) : offer.startDate;
    const endDate = req.body.endDate ? new Date(req.body.endDate) : offer.endDate;

    if (endDate <= startDate) {
      return res.status(400).json({
        success: false,
        message: 'End date must be after start date'
      });
    }

    const updatedOffer = await Offer.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('applicableProducts', 'product_id name brand category price gram');

    res.status(200).json({
      success: true,
      message: 'Offer updated successfully',
      data: updatedOffer
    });
  } catch (error) {
    console.error('Error updating offer:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Delete offer
exports.deleteOffer = async (req, res) => {
  try {
    const offer = await Offer.findById(req.params.id);

    if (!offer) {
      return res.status(404).json({
        success: false,
        message: 'Offer not found'
      });
    }

    await Offer.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Offer deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting offer:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Toggle offer active status
exports.toggleOfferStatus = async (req, res) => {
  try {
    const offer = await Offer.findById(req.params.id);

    if (!offer) {
      return res.status(404).json({
        success: false,
        message: 'Offer not found'
      });
    }

    offer.isActive = !offer.isActive;
    await offer.save();

    res.status(200).json({
      success: true,
      message: `Offer ${offer.isActive ? 'activated' : 'deactivated'} successfully`,
      data: offer
    });
  } catch (error) {
    console.error('Error toggling offer status:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get offer statistics
exports.getOfferStats = async (req, res) => {
  try {
    const now = new Date();

    const totalOffers = await Offer.countDocuments();
    const activeOffers = await Offer.countDocuments({
      isActive: true,
      startDate: { $lte: now },
      endDate: { $gte: now }
    });
    const upcomingOffers = await Offer.countDocuments({
      startDate: { $gt: now }
    });
    const expiredOffers = await Offer.countDocuments({
      endDate: { $lt: now }
    });

    res.status(200).json({
      success: true,
      data: {
        totalOffers,
        activeOffers,
        upcomingOffers,
        expiredOffers
      }
    });
  } catch (error) {
    console.error('Error fetching offer stats:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching offer statistics'
    });
  }
};

// Get products by category and brand for offer management
exports.getProductsByCategory = async (req, res) => {
  try {
    const { category, brand } = req.query;

    if (!category) {
      return res.status(400).json({
        success: false,
        message: 'Category is required'
      });
    }

    // Build query filter
    const filter = {
      category: { $regex: new RegExp(category, 'i') }
    };

    // Add brand filter if provided
    if (brand) {
      filter.brand = { $regex: new RegExp(brand, 'i') };
    }

    const products = await Product.find(filter)
      .select('product_id name brand category price gram image')
      .sort({ name: 1 });

    res.status(200).json({
      success: true,
      count: products.length,
      data: products
    });
  } catch (error) {
    console.error('Error fetching products by category:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching products'
    });
  }
};

// Get all brands by category
exports.getBrandsByCategory = async (req, res) => {
  try {
    const { category } = req.query;

    if (!category) {
      return res.status(400).json({
        success: false,
        message: 'Category is required'
      });
    }

    const brands = await Product.distinct('brand', {
      category: { $regex: new RegExp(category, 'i') }
    });

    res.status(200).json({
      success: true,
      count: brands.length,
      data: brands.filter(Boolean).sort()
    });
  } catch (error) {
    console.error('Error fetching brands:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching brands'
    });
  }
};


