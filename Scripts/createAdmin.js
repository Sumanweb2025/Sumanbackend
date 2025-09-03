
const mongoose = require('mongoose');
const User = require('../Models/user.model');
require('dotenv').config();

const createAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    const adminExists = await User.findOne({ role: 'admin' });
    if (adminExists) {
      console.log('Admin user already exists');
      return;
    }

    const admin = new User({
      name: 'Admin',
      email: 'admin@iyappasweets.com',
      password: 'admin123',
      role: 'admin',
      authProvider: 'local',
      isActive: true
    });

    await admin.save();
    console.log('Admin user created successfully');
    console.log('Email: admin@iyappasweets.com');
    console.log('Password: admin123');
    
  } catch (error) {
    console.error('Error creating admin:', error);
  } finally {
    mongoose.disconnect();
  }
};

createAdmin();