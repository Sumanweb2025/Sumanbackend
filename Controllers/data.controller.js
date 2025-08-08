const Product = require('../Models/data.model');
const path = require('path');
const fs = require('fs').promises;


exports.importProducts = async (req, res) => {
  try {
    // Resolve the file path safely
    const jsonFilePath = path.join(__dirname, '../Data/realistic_50_products.json');

    // Read and parse the JSON file
    const jsonData = await fs.readFile(jsonFilePath, 'utf8');
    const data = JSON.parse(jsonData);

    // Insert data into MongoDB
    const result = await Product.insertMany(data);

    res.status(200).json({
      message: 'Products imported successfully!',
      count: result.length,
    });
  } catch (error) {
    res.status(500).json({
      message: 'Error importing products',
      error: error.message,
    });
  }
};


exports.getProducts = async (req, res) => {
  try {
    const products = await Product.find();
    res.status(200).json(products);
  } catch (error) {
    res.status(500).json({
      message: 'Error fetching products',
      error: error.message,
    });
  }
};
