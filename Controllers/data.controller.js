const Product = require('../Models/data.model');
const path = require('path');
const fs = require('fs').promises;

exports.importProducts = async (req, res) => {
  try {
    // Resolve the file path safely
    const jsonFilePath = path.join(__dirname, '../Data/WEBSITE PRODUCT LIST FN2.json');

    // Check if file exists
    await fs.access(jsonFilePath);

    // Read and parse the JSON file
    const jsonData = await fs.readFile(jsonFilePath, 'utf8');
    const data = JSON.parse(jsonData);

    // Validate data structure
    if (!Array.isArray(data)) {
      return res.status(400).json({
        message: 'Invalid data format. Expected an array of products.',
      });
    }

    // Clean and transform the data
    const cleanedData = data.map(product => {
      // Clean price - remove currency symbols and convert to number
      let cleanPrice = product.Price;
      if (typeof cleanPrice === 'string') {
        // Remove currency symbols, commas, and other non-numeric characters except decimal point
        cleanPrice = cleanPrice.replace(/[$₹,\s]/g, '');
        cleanPrice = parseFloat(cleanPrice) || 0;
      }

      // Clean piece - ensure it's a number
      let cleanPiece = product.Piece;
      if (typeof cleanPiece === 'string') {
        cleanPiece = parseInt(cleanPiece) || 0;
      }

      return {
        ...product,
        Price: cleanPrice,
        Piece: cleanPiece || 0,
        // Ensure other fields are properly formatted
        Product_id: product.Product_id || '',
        Brand: product.Brand || '',
        Name: product.Name || '',
        Gram: product.Gram || '',
        Category: product.Category || '',
        'Sub-category': product['Sub-category'] || '',
        Ingredients: product.Ingredients || '',
        Description: product.Description || '',
        'Storage Condition': product['Storage Condition'] || '',
        image: product.image || ''
      };
    });

    // Clear existing products (optional - remove if you want to append)
    await Product.deleteMany({});

    // Insert cleaned data into MongoDB
    const result = await Product.insertMany(cleanedData);

    res.status(200).json({
      message: 'Products imported successfully!',
      count: result.length,
      products: result
    });
  } catch (error) {
    console.error('Import error:', error);
    
    if (error.code === 'ENOENT') {
      return res.status(404).json({
        message: 'JSON file not found',
        path: path.join(__dirname, '../Data/WEBSITE PRODUCT LIST FN2.json')
      });
    }

    res.status(500).json({
      message: 'Error importing products',
      error: error.message,
    });
  }
};

exports.getProducts = async (req, res) => {
  try {
    const products = await Product.find();
    
    res.status(200).json({
      message: 'Products fetched successfully',
      count: products.length,
      products: products
    });
  } catch (error) {
    console.error('Fetch error:', error);
    res.status(500).json({
      message: 'Error fetching products',
      error: error.message,
    });
  }
};

// Additional controller methods you might need

exports.getProductById = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Product.findById(id);
    
    if (!product) {
      return res.status(404).json({
        message: 'Product not found'
      });
    }

    res.status(200).json({
      message: 'Product found',
      product: product
    });
  } catch (error) {
    res.status(500).json({
      message: 'Error fetching product',
      error: error.message,
    });
  }
};

exports.getProductsByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    const products = await Product.find({ Category: category });
    
    res.status(200).json({
      message: 'Products fetched successfully',
      category: category,
      count: products.length,
      products: products
    });
  } catch (error) {
    res.status(500).json({
      message: 'Error fetching products by category',
      error: error.message,
    });
  }
};