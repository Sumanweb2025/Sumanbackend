
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for profile image uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'uploads/profile-images';

    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Generate unique filename - we'll rename later in controller if needed
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const fileExtension = path.extname(file.originalname);
    const fileName = `profile-${uniqueSuffix}${fileExtension}`;

    // Store original filename in req for later use
    req.generatedFilename = fileName;
    cb(null, fileName);
  }
});

// File filter for images only
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, GIF and WebP images are allowed.'), false);
  }
};

// Multer upload configuration
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: fileFilter
});

module.exports = {
  uploadProfileImage: upload.single('profileImage')
};