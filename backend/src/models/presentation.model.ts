import mongoose, { Document, Schema } from 'mongoose';
import { Presentation, Slide } from '../types';

// Define the Slide schema
const SlideSchema: Schema = new Schema({
  id: { type: String, required: true },
  title: { type: String, required: true },
  content: { type: String, required: true },
  speakerNotes: { type: String, required: true },
  imageUrl: { type: String },
  imagePrompt: { type: String },
  position: { type: Number, required: true }
});

// Define the Presentation schema
const PresentationSchema: Schema = new Schema({
  id: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  topic: { type: String, required: true },
  language: { type: String, required: true },
  presentationStyle: { 
    type: String, 
    enum: ['academic', 'business', 'storytelling', 'technical'],
    required: true 
  },
  targetAudience: { 
    type: String, 
    enum: ['school', 'college', 'professional', 'training'],
    required: true 
  },
  template: { type: String, required: true },
  slides: [SlideSchema],
  userId: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Update the updatedAt field before saving
PresentationSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Create and export the Presentation model
export const PresentationModel = mongoose.model<Presentation & Document>('WeavePresentation', PresentationSchema);

// Create a separate index on userId for efficient querying
export const initializePresentationIndexes = async () => {
  try {
    await PresentationModel.createIndexes();
    console.log('✅ Presentation collection indexes created');
  } catch (error) {
    console.error('❌ Error creating presentation indexes:', error);
  }
};