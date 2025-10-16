const mongoose = require('mongoose');
require('dotenv').config();

const uri = process.env.MONGODB_URI;


async function connectDatabase() {
  try {
    console.log("🟡 Connecting to MongoDB...");
    console.log("URI:", uri ? uri.slice(0, 60) + "..." : "undefined");

    if (!uri) {
      console.error("❌ MONGO_URI not found in .env");
      process.exit(1);
    }

    mongoose.set('strictQuery', false);

    await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 30000, // wait up to 30 s
    });

    mongoose.connection.on('connected', () => {
      console.log('✅ MongoDB connected successfully');
    });

    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err);
    });

    console.log('🟢 Database connection has been established successfully.');
  } catch (error) {
    console.error('❌ Unable to connect to the database:', error);
  }
}

module.exports = connectDatabase;

//Connection function
async function connectDatabase() {
    try {
        await mongoose.connect(uri, {

            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('Database connection has been established successfully.');
    } catch (error) {
        console.error('Unable to connect to the database:', error);
    }
}

module.exports = connectDatabase;

