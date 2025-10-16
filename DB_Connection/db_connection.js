const mongoose = require('mongoose');
require('dotenv').config();

const uri = process.env.MONGODB_URI;


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

