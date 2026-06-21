import mongoose from 'mongoose';
import config from './config.js';

export async function connectDB() {
  try {
    await mongoose.connect(config.mongoUri, { family: 4 });
    console.log('MongoDB connected');
  } catch (err) {
    console.error('MongoDB connection failed:', err.message);
    process.exit(1);
  }
}

export default mongoose;
