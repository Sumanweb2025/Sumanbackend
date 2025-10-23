const express = require('express')
const cors = require('cors')
require('dotenv').config();
const bodyparser = require('body-parser')
const compression = require('compression')
const connectDatabase = require('./DB_Connection/db_connection');
const PORT = process.env.PORT;
const Approuter = require('./Routers/router')
const path = require('path');
const { cleanupExpiredGuestData } = require('./Utils/guestMigration');
const cron = require('node-cron');


//Initialize the app
const app = express()

// Enable compression for all responses
app.use(compression({
  level: 6, // Compression level (0-9)
  threshold: 1024, // Only compress responses larger than 1KB
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  }
}));

// CORS should be first
app.use(cors({
  origin: ["https://iyappaa.com", "https://www.iyappaa.com"],
  credentials: true
}));

// This handles JSON payloads (like your bulk import)
app.use(bodyparser.json({ limit: '50mb' }));
app.use(bodyparser.urlencoded({ limit: '50mb', extended: true }));

// These are redundant since you already used bodyparser above, but keeping for safety
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Run cleanup every day at 2 AM
cron.schedule('0 2 * * *', async () => {
  //console.log('Running guest data cleanup job...');
  try {
    const result = await cleanupExpiredGuestData();
    //console.log('Cleanup completed:', result);
  } catch (error) {
    console.error('Cleanup job failed:', error);
  }
});


app.get('/', (req, res) => {
  res.send("Welcome to Iyappaa Sweets & Snacks!")
})
// Serve static files with caching headers for better performance
app.use('/images/Products', express.static(path.join(__dirname, 'Iyappaa/Product1'), {
  maxAge: '7d', // Cache images for 7 days
  etag: true,
  lastModified: true,
  setHeaders: (res, path) => {
    // Set cache control headers
    res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
  }
}));
// app.use('/uploads', express.static('uploads'))

app.use(Approuter);



async function startServer() {
  try {
    // Connect to MongoDB
    await connectDatabase();
    //console.log("Database Connected Successfully!")

    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Unable to start server:', error);
  }
}

// Call the async function to start the server
startServer();



