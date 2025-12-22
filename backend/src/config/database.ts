import mongoose from 'mongoose';
import env from './env';

export async function connectDatabase(): Promise<void> {
  try {
    if (!env.MONGODB_URI) {
      return;
    }

    await mongoose.connect(env.MONGODB_URI);
    console.log('MongoDB connected');
  } catch (error) {
    // Don't throw - allow app to run without MongoDB for basic RAG functionality
  }
}

export async function disconnectDatabase(): Promise<void> {
  try {
    await mongoose.disconnect();
  } catch (error) {
    // Silent disconnect
  }
}
