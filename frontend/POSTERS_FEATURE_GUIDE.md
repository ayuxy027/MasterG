# Educational Posters System - Implementation Guide

## Overview
AI-powered educational poster generation system using Google Gemini Imagen 3.0 API with multilingual support and cultural sensitivity for Indian educational context.

---

## Architecture

### Backend Components

#### 1. **Service Layer** (`backend/src/services/poster.service.ts`)
- **Prompt Enhancement**: Uses Gemini Flash 1.5 to enhance user prompts with educational context
- **Image Generation**: Integrates with Gemini Imagen 3.0 API for high-quality poster creation
- **Category-Specific Context**: Automatically adds relevant educational themes per category
- **Caching**: 30-minute cache for repeated generations to reduce API calls
- **Error Handling**: Comprehensive error handling for quota limits and safety filters

**Key Functions:**
```typescript
enhanceQuery(query, category, language) // Enhances prompt with educational context
generateImage(enhancedPrompt, aspectRatio) // Calls Imagen API
generateMultiplePosters(request) // Batch generation with caching
```

#### 2. **Controller Layer** (`backend/src/controllers/poster.controller.ts`)
- **POST /api/posters/generate**: Generate 1-4 posters based on prompt
- **GET /api/posters/categories**: Get available educational categories
- **GET /api/posters/languages**: Get supported Indian languages

**Request Validation:**
- Query: Required, non-empty string
- Category: Optional, defaults to 'general-knowledge'
- Language: Optional, defaults to 'English'
- Count: 1-4 posters, defaults to 4
- Aspect Ratio: 1:1, 16:9, 9:16, 4:3, or 3:4

#### 3. **Routes** (`backend/src/routes/poster.routes.ts`)
```typescript
POST   /api/posters/generate    // Generate posters
GET    /api/posters/categories  // List categories
GET    /api/posters/languages   // List languages
```

---

### Frontend Components

#### 1. **PostersPage** (`frontend/src/components/Posters/PostersPage.tsx`)
Main container component that orchestrates the entire poster generation workflow.

**State Management:**
```typescript
- categories: PosterCategory[]      // Educational categories
- languages: Language[]             // Supported languages
- selectedCategory: string          // Current category selection
- selectedLanguage: string          // Current language
- prompt: string                    // User's description
- count: number (1-4)              // Number of posters to generate
- aspectRatio: '1:1' | '16:9' | ... // Image dimensions
- isGenerating: boolean             // Loading state
- generatedPosters: GeneratedPoster[] // Results
- error: string | null              // Error messages
- enhancedPrompt: string            // AI-enhanced prompt
```

**Key Features:**
- Loads categories and languages on mount
- Handles generation with error recovery
- Downloads individual or all posters
- Displays enhanced prompts to users

#### 2. **CategorySelector** (`frontend/src/components/Posters/CategorySelector.tsx`)
Interactive category selection with icons and custom category support.

**Props:**
```typescript
{
  categories: PosterCategory[],
  selectedCategory: string,
  onSelectCategory: (category: string) => void
}
```

**Features:**
- Visual category grid with emoji icons
- Custom category creation
- Responsive design

#### 3. **PromptInput** (`frontend/src/components/Posters/PromptInput.tsx`)
Prompt input area with example suggestions and generation trigger.

**Props:**
```typescript
{
  prompt: string,
  onPromptChange: (prompt: string) => void,
  onGenerate: () => void,
  isGenerating: boolean,
  selectedCategory: string,
  categories: PosterCategory[]
}
```

**Features:**
- Multi-line textarea with 500 character limit
- Category-specific example prompts
- Character counter
- Disabled state during generation

#### 4. **GenerationResults** (`frontend/src/components/Posters/GenerationResults.tsx`)
Displays generated posters with download functionality.

**Props:**
```typescript
{
  posters: GeneratedPoster[],
  isGenerating: boolean,
  count: number,
  onDownload: (poster, index) => void,
  onDownloadAll: () => void
}
```

**States:**
- Loading: Animated spinner with status message
- Empty: Placeholder with instructions
- Results: Image grid with hover effects and download buttons

---

## API Integration

### Service Client (`frontend/src/services/posterApi.ts`)

```typescript
// Generate posters
const response = await generatePosters({
  query: "Create a colorful diagram of photosynthesis",
  category: "science",
  language: "Hindi",
  count: 3,
  aspectRatio: "16:9"
});

// Get categories
const categories = await getCategories();

// Get languages
const languages = await getLanguages();
```

**Error Handling:**
```typescript
try {
  const posters = await generatePosters(request);
} catch (err) {
  if (err instanceof PosterApiError) {
    // Handle specific errors: quota, safety filter, network
    console.error(err.message, err.details);
  }
}
```

---

## Type Definitions (`frontend/src/types/poster.ts`)

### Core Types
```typescript
interface PosterCategory {
  id: string;              // 'science', 'mathematics', etc.
  name: string;            // Display name
  description: string;     // Category description
  icon: string;            // Emoji icon
  examples: string[];      // Example prompts
}

interface Language {
  code: string;            // 'en', 'hi', 'mr', etc.
  name: string;            // 'English', 'Hindi'
  native: string;          // 'English', 'हिंदी'
}

interface GeneratedPoster {
  imageBase64: string;     // Base64 encoded PNG
  mimeType: string;        // 'image/png'
  enhancedPrompt: string;  // AI-enhanced description
}
```

---

## Educational Categories

1. **Science** (🔬)
   - Physics, Chemistry, Biology concepts
   - Scientific processes and experiments
   - Natural phenomena

2. **Mathematics** (📐)
   - Number systems, geometry, algebra
   - Mathematical concepts visualization
   - Problem-solving strategies

3. **History** (📜)
   - Historical events and timelines
   - Indian freedom movement
   - World history

4. **Geography** (🌍)
   - Maps, landforms, climate
   - Indian geography
   - World geography

5. **Social Studies** (👥)
   - Civics, economics, sociology
   - Government and democracy
   - Cultural studies

6. **Languages** (📚)
   - Grammar rules, literature
   - Poetry, prose
   - Language learning

7. **General Knowledge** (💡)
   - Current affairs, facts
   - General awareness
   - Trivia

8. **Motivational** (⭐)
   - Inspirational quotes
   - Success stories
   - Life lessons

9. **Arts & Culture** (🎨)
   - Indian art forms
   - Music, dance, crafts
   - Cultural heritage

10. **Health & Education** (🏥)
    - Health awareness
    - Hygiene, nutrition
    - Wellness

---

## Supported Languages

- **English** (en)
- **Hindi** (hi) - हिंदी
- **Marathi** (mr) - मराठी
- **Bengali** (bn) - বাংলা
- **Tamil** (ta) - தமிழ்
- **Telugu** (te) - తెలుగు
- **Gujarati** (gu) - ગુજરાતી
- **Kannada** (kn) - ಕನ್ನಡ
- **Malayalam** (ml) - മലയാളം
- **Punjabi** (pa) - ਪੰਜਾਬੀ

---

## User Flow

```
1. User lands on /posters page
   ↓
2. Loads categories and languages
   ↓
3. User selects category (e.g., Science)
   ↓
4. User selects language (e.g., Hindi)
   ↓
5. User configures settings:
   - Number of posters: 1-4 (slider)
   - Aspect ratio: dropdown
   ↓
6. User enters prompt in PromptInput
   - Sees category-specific examples
   - Character counter shows 0/500
   ↓
7. User clicks "Generate Educational Posters"
   ↓
8. Backend Flow:
   a. Gemini Flash enhances prompt
   b. Adds educational context + language
   c. Gemini Imagen generates images
   d. Returns base64 encoded PNGs
   ↓
9. Frontend displays:
   - Enhanced prompt in blue info box
   - Generated posters in responsive grid
   - Download buttons on hover
   - "Download All" button (if multiple)
   ↓
10. User downloads posters:
    - Individual: Click poster download icon
    - All: Click "Download All" button
    - Files saved as: educational-poster-{category}-{index}.png
```

---

## Navigation Integration

### Navbar
- **Desktop**: Icon + "Posters" link in main navigation
- **Mobile**: "Posters" in hamburger menu
- **Icon**: Image/picture SVG icon

### Routing
```typescript
// App.tsx
<Route path="/posters" element={
  <Layout>
    <PostersPage />
  </Layout>
} />
```

---

## API Configuration

### Environment Variables
```env
# backend/.env
GEMINI_API_KEY=AIzaSyAgL7rlqWCYqwRO1txIXT2__zKtJTRv95E
```

### API Endpoints
```typescript
// Development
const API_BASE_URL = 'http://localhost:5000/api';

// Production
const API_BASE_URL = process.env.VITE_API_BASE_URL || '/api';
```

---

## Prompt Enhancement Example

**User Input:**
```
Create a diagram showing water cycle
```

**Enhanced Prompt (by Gemini Flash):**
```
Educational poster for Indian students showing the complete water cycle process. 
Include labeled stages: evaporation from water bodies, condensation forming clouds, 
precipitation as rain, and collection in rivers and oceans. Use vibrant colors, 
clear arrows showing flow, simple Hindi labels for each stage. Child-friendly 
illustration style suitable for primary school students. High contrast, visual 
clarity for classroom display.
```

**Generated**: High-quality educational poster with Hindi text integration

---

## Error Handling

### Frontend Errors
```typescript
// Quota Exceeded
"Generation limit reached. Please try again later."

// Safety Filter
"Content flagged by safety filters. Please modify your prompt."

// Network Error
"Failed to connect to server. Check your internet connection."

// Validation Error
"Please enter a prompt to generate posters."
```

### Backend Errors
```typescript
// Quota: HTTP 429
{ error: 'API quota exceeded. Try again after 1 hour.' }

// Safety: HTTP 400
{ error: 'Content blocked by safety filters', details: {...} }

// Invalid: HTTP 400
{ error: 'Query is required' }
```

---

## Performance Optimizations

1. **Caching**: 30-minute cache for identical requests
2. **Lazy Loading**: Categories/languages loaded on mount
3. **Debouncing**: Prevent rapid generation clicks
4. **Batch Downloads**: Sequential with 500ms delay to prevent browser blocking

---

## Testing Checklist

- [ ] Category selection updates prompt placeholder
- [ ] Language selection reflected in generation
- [ ] Slider changes poster count (1-4)
- [ ] Aspect ratio dropdown works
- [ ] Character counter shows correct count (max 500)
- [ ] Example prompts populate textarea
- [ ] Generate button disabled when prompt empty
- [ ] Loading state shows during generation
- [ ] Error messages display correctly
- [ ] Enhanced prompt displays after generation
- [ ] Posters render in correct aspect ratio
- [ ] Individual download works
- [ ] Download All works (multiple posters)
- [ ] Responsive design on mobile
- [ ] Navbar link navigates correctly

---

## Known Limitations

1. **Quota**: Google Imagen has daily/monthly limits
2. **Safety Filters**: Some educational content may be blocked
3. **Text in Images**: Hindi/other languages may have imperfect rendering
4. **Generation Time**: 5-15 seconds per poster depending on complexity
5. **File Size**: High-resolution PNGs can be large (2-5MB each)

---

## Future Enhancements

1. **History**: Save generated posters to user account
2. **Templates**: Pre-defined templates per category
3. **Editing**: Basic text overlay editor
4. **Sharing**: Share posters via link/social media
5. **Collections**: Organize posters into folders
6. **Print**: Optimize for print layout
7. **Analytics**: Track popular categories/languages
8. **Batch Upload**: Upload multiple prompts via CSV

---

## Troubleshooting

### "Failed to generate posters"
- Check `GEMINI_API_KEY` in backend `.env`
- Verify API key has Imagen access enabled
- Check quota limits in Google Cloud Console

### Posters not downloading
- Check browser download settings
- Verify popup blocker not blocking downloads
- Try "Download All" for batch downloads

### Images not displaying
- Check Network tab for API errors
- Verify base64 encoding is valid
- Check Content-Type headers

---

## File Structure
```
backend/
├── src/
│   ├── services/
│   │   └── poster.service.ts      # Image generation logic
│   ├── controllers/
│   │   └── poster.controller.ts   # API endpoints
│   └── routes/
│       └── poster.routes.ts       # Route registration

frontend/
├── src/
│   ├── components/
│   │   └── Posters/
│   │       ├── PostersPage.tsx           # Main container
│   │       ├── CategorySelector.tsx      # Category picker
│   │       ├── PromptInput.tsx          # Input + generate
│   │       └── GenerationResults.tsx     # Results display
│   ├── services/
│   │   └── posterApi.ts           # API client
│   └── types/
│       └── poster.ts              # TypeScript types
```

---

## Quick Start

### Backend
```bash
cd backend
npm install
# Add GEMINI_API_KEY to .env
npm run dev
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Test Generation
1. Navigate to http://localhost:5174/posters
2. Select "Science" category
3. Select "Hindi" language
4. Enter: "Create a diagram showing photosynthesis"
5. Set count to 2, ratio to 16:9
6. Click "Generate Educational Posters"
7. Wait 10-15 seconds
8. Download generated posters

---

## Support
For issues or questions:
- Check browser console for errors
- Verify backend logs for API failures
- Review Google Cloud Console for quota status
- Test with simple prompts first ("apple", "tree")

---

**Status**: ✅ Fully Implemented
**Last Updated**: November 24, 2024
**Version**: 1.0.0
