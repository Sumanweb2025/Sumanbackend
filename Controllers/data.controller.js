const Product = require('../Models/data.model');
const path = require('path');
const fs = require('fs').promises;

// Helper function to normalize object keys
function normalizeKeys(obj) {
  const newObj = {};
  for (let key in obj) {
    if (obj.hasOwnProperty(key)) {
      // Convert key to lowercase + replace space & - with underscore
      const newKey = key.toLowerCase().replace(/[\s-]+/g, "_");
      newObj[newKey] = obj[key];
    }
  }
  return newObj;
}

exports.importProducts = async (req, res) => {
  try {
    // Resolve file path safely
    const jsonFilePath = path.join(__dirname, '../Data/Product_data_final.json');

    // Read and parse JSON file
    const jsonData = await fs.readFile(jsonFilePath, 'utf8');
    const data = JSON.parse(jsonData);

    // Normalize and prevent duplicates
    const normalizedData = data.map((item) => normalizeKeys(item));

    let insertedCount = 0;
    for (const product of normalizedData) {
      // Duplicate check (based on product_id or name)
      const exists = await Product.findOne({
        $or: [{ product_id: product.product_id }, { name: product.name }]
      });

      if (!exists) {
        await Product.create(product);
        insertedCount++;
      }
    }

    res.status(200).json({
      message: 'Products imported successfully!',
      inserted: insertedCount,
      skipped: normalizedData.length - insertedCount
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
