import mongoose from 'mongoose';
import env from './env';

export async function connectDatabase(): Promise<void> {
  try {
    if (!env.MONGODB_URI) {
      console.warn('⚠️  MongoDB URI not configured. Chat history will not be saved.');
      return;
    }

    await mongoose.connect(env.MONGODB_URI);
    console.log('✅ MongoDB connected successfully');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    // Don't throw - allow app to run without MongoDB for basic RAG functionality
    console.warn('⚠️  Continuing without MongoDB. Chat history will not be saved.');
  }
}

export async function disconnectDatabase(): Promise<void> {
  try {
    await mongoose.disconnect();
    console.log('MongoDB disconnected');
  } catch (error) {
    console.error('MongoDB disconnect error:', error);
  }
}
