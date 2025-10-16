const express = require('express')
const cors = require('cors')
require('dotenv').config();
const bodyparser = require('body-parser')
const connectDatabase = require('./DB_Connection/db_connection');
const PORT = process.env.PORT ;
const Approuter = require('./Routers/router')
const path = require('path');
const { cleanupExpiredGuestData } = require('./Utils/guestMigration');
const cron = require('node-cron');


//Initialize the app
const app = express()
app.use(cors());
app.use(bodyparser.json());

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
// Change to EXACTLY this:
app.use('/images/Products', express.static(path.join(__dirname, 'Iyappaa/Product1')));
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



