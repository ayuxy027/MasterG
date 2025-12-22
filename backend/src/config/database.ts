import mongoose from 'mongoose';

export async function connectDatabase(): Promise<void> {
  try {
    // Hardcode localhost MongoDB
    const mongoUri = "mongodb://localhost:27017/masterg";

    await mongoose.connect(mongoUri);
    console.log('MongoDB connected');
  } catch (error) {
    // Don't throw - allow app to run without MongoDB for basic RAG functionality
    console.warn('MongoDB connection failed (app will continue without session persistence):', error instanceof Error ? error.message : error);
  }
}

export async function disconnectDatabase(): Promise<void> {
  try {
    await mongoose.disconnect();
  } catch (error) {
    // Silent disconnect
  }
}
