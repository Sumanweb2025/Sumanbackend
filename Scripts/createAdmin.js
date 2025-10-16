
const mongoose = require('mongoose');
const User = require('../Models/user.model');
require('dotenv').config();

const createAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    const adminExists = await User.findOne({ role: 'admin' });
    if (adminExists) {
      //console.log('Admin user already exists');
      return;
    }

    const admin = new User({
      name: 'Admin',
      email: process.env.ADMIN_EMAIL,
      password: process.env.ADMIN_PASSWORD,
      role: 'admin',
      authProvider: 'local',
      isActive: true
    });

    await admin.save();
    // console.log('Admin user created successfully');

  } catch (error) {
    console.error('Error creating admin:', error);
  } finally {
    mongoose.disconnect();
  }
};

createAdmin();