const Product = require('../Models/product.model');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

// Helper function to add image URLs to product
const addImageUrls = (product, req) => {
  const baseUrl = `${req.protocol}://${req.get('host')}/images/Products/`;
  const images = product.image || [];
  
  return {
    ...product.toObject(),
    // Main image URL (first image in array)
    imageUrl: images.length > 0 ? baseUrl + images[0] : null,
    // Secondary/hover image URL (second image in array)
    secondaryImageUrl: images.length > 1 ? baseUrl + images[1] : null,
    // All image URLs array
    imageUrls: images.map(img => baseUrl + img),
    // For backward compatibility
    hoverImageUrl: images.length > 1 ? baseUrl + images[1] : null
  };
};

// Configure Multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, '../Iyappaa/Products');
    // Create uploads directory if it doesn't exist
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  const filetypes = /jpeg|jpg|png|gif/;
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = filetypes.test(file.mimetype);
  
  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Error: Images only!'));
  }
};

exports.upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: fileFilter
});

// Get all products
const getAllProducts = async (req, res) => {
  try {
    const products = await Product.find();
    
    // Add full image URLs to each product using helper function
    const productsWithImageUrl = products.map(product => addImageUrls(product, req));
    
    res.status(200).json({
      success: true,
      count: productsWithImageUrl.length,
      data: productsWithImageUrl
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching products',
      error: error.message
    });
  }
};

// Get product by ID
const getProductById = async (req, res) => {
  try {
    const product = await Product.findOne({ product_id: req.params.id });
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    
    // Add full image URLs using helper function
    const productWithImageUrl = addImageUrls(product, req);
    
    res.status(200).json({
      success: true,
      data: productWithImageUrl
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching product',
      error: error.message
    });
  }
};

// Create new product (with image upload)
const createProduct = async (req, res) => {
  try {
    const productData = req.body;
    
    // If image was uploaded
    if (req.file) {
      productData.image = req.file.filename;
    }
    
    const product = new Product(productData);
    await product.save();
    
    // Add full image URL to response
    const productWithImageUrl = {
      ...product.toObject(),
      imageUrl: product.image ? `${req.protocol}://${req.get('host')}/images/Products/${product.image}` : null
    };
    
    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: productWithImageUrl
    });
  } catch (error) {
    // Delete uploaded file if error occurred
    if (req.file) {
      fs.unlinkSync(path.join(__dirname, '../Iyappaa/Products', req.file.filename));
    }
    
    res.status(400).json({
      success: false,
      message: 'Error creating product',
      error: error.message
    });
  }
};

// Update product (with optional image update)
const updateProduct = async (req, res) => {
  try {
    const product = await Product.findOne({ product_id: req.params.id });
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    
    const updateData = req.body;
    
    // Handle image update if new file was uploaded
    if (req.file) {
      // Delete old image if it exists
      if (product.image) {
        const oldImagePath = path.join(__dirname, '../Iyappaa/Products', product.image);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }
      updateData.image = req.file.filename;
    }
    
    const updatedProduct = await Product.findOneAndUpdate(
      { product_id: req.params.id },
      updateData,
      { new: true, runValidators: true }
    );
    
    // Add full image URL to response
    const productWithImageUrl = {
      ...updatedProduct.toObject(),
      imageUrl: updatedProduct.image ? `${req.protocol}://${req.get('host')}/images/Products/${updatedProduct.image}` : null
    };
    
    res.status(200).json({
      success: true,
      message: 'Product updated successfully',
      data: productWithImageUrl
    });
  } catch (error) {
    // Delete uploaded file if error occurred
    if (req.file) {
      fs.unlinkSync(path.join(__dirname, '../Iyappaa/Products', req.file.filename));
    }
    
    res.status(400).json({
      success: false,
      message: 'Error updating product',
      error: error.message
    });
  }
};

// Delete product (with image cleanup)
const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findOneAndDelete({ product_id: req.params.id });
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    
    // Delete associated image if it exists
    if (product.image) {
      const imagePath = path.join(__dirname, '../Iyappaa/Products', product.image);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }
    
    res.status(200).json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting product',
      error: error.message
    });
  }
};

// Search products
const searchProducts = async (req, res) => {
  try {
    const { q, category, brand, minPrice, maxPrice } = req.query;
    let filter = {};
    
    if (q) {
      filter.$or = [
        { name: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } }
      ];
    }
    
    if (category) {
      filter.category = { $regex: category, $options: 'i' };
    }
    
    if (brand) {
      filter.brand = { $regex: brand, $options: 'i' };
    }
    
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = parseFloat(minPrice);
      if (maxPrice) filter.price.$lte = parseFloat(maxPrice);
    }
    
    const products = await Product.find(filter);
    
    // Add full image URLs to each product using helper function
    const productsWithImageUrl = products.map(product => addImageUrls(product, req));
    
    res.status(200).json({
      success: true,
      count: productsWithImageUrl.length,
      data: productsWithImageUrl
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error searching products',
      error: error.message
    });
  }
};

// Improved getAvailableFilters
const getAvailableFilters = async (req, res) => {
  try {
    const [categories, brands] = await Promise.all([
      Product.distinct('category').collation({locale: 'en', strength: 2}).sort(),
      Product.distinct('brand').collation({locale: 'en', strength: 2}).sort()
    ]);

    if (categories.length === 0 && brands.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No products found to generate filters'
      });
    }

    res.status(200).json({
      success: true,
      data: { categories, brands }
    });
  } catch (error) {
    console.error('Error fetching filter options:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch filter options',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get top-rated and best-selling products for home page
const getFeaturedProducts = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    
    const products = await Product.find()
      .sort({ 
        rating: -1,           
        createdAt: -1         
      })
      .limit(limit);
    
    // Add full image URLs to each product using helper function
    const productsWithImageUrl = products.map(product => addImageUrls(product, req));
    
    res.status(200).json({
      success: true,
      count: productsWithImageUrl.length,
      data: productsWithImageUrl
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching featured products',
      error: error.message
    });
  }
};

module.exports = {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  searchProducts,
  getAvailableFilters,
  getFeaturedProducts,
  upload: multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: fileFilter
  })
};