const mongoose = require('mongoose');
require('dotenv').config();
const Photo = require('./models/Photo');

const seedPhotos = async () => {
  await mongoose.connect(process.env.MONGO_URI);

  const samplePhotos = [
    {
      url: 'https://images.unsplash.com/photo-1558618047-3c8c76f5ebc6?w=800', // kitchen earthy
