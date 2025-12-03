# MyScript Integration for EduRAG System

## Table of Contents
1. [Overview](#overview)
2. [Integration Architecture](#integration-architecture)
3. [Technical Requirements](#technical-requirements)
4. [Implementation Guide](#implementation-guide)
5. [API Documentation](#api-documentation)
6. [Security Considerations](#security-considerations)
7. [Performance Guidelines](#performance-guidelines)
8. [Testing Strategy](#testing-strategy)
9. [Deployment Checklist](#deployment-checklist)
10. [Troubleshooting](#troubleshooting)

## Overview

### Purpose
This document outlines the integration of MyScript technology into the EduRAG system to enhance handwritten content processing capabilities. MyScript will complement existing OCR functionality by providing superior handwriting recognition for educational handwritten materials.

### Benefits
- Enhanced accuracy for handwritten content recognition
- Real-time handwriting-to-text conversion
- Support for mathematical equations and diagrams
- Improved educational content processing
- Better student engagement with handwriting input

### Scope
- Frontend handwriting input canvas integration
- Backend MyScript Cloud API integration
- Enhanced OCR service with MyScript fallback
- Updated document processing pipeline
- Multilingual support for handwritten content

## Integration Architecture

### System Components
```
Frontend (React)
├── HandwritingInput Component
├── MyScript Web SDK
└── API Communication Layer

Backend (Node.js/Express)
├── MyScript Service
├── Enhanced OCR Service  
└── Updated Upload Controller

External Services
├── MyScript Cloud API
├── Existing OCR (Tesseract)
└── ChromaDB/MongoDB
```

### Data Flow
1. User writes on canvas or uploads handwritten image
2. Frontend sends data to backend or processes directly (Web SDK)
3. Backend processes through MyScript Cloud API
4. Recognized text stored in document system
5. Text processed through existing RAG pipeline
6. Results returned to user with source citations

### Integration Points
- **Document Upload Pipeline**: Enhanced to handle handwritten content
- **OCR Service**: Updated to choose between Tesseract and MyScript
- **Upload Controller**: Modified to process handwritten content
- **User Interface**: Added handwriting input modal/canvas

## Technical Requirements

### Backend Requirements
- **Node.js**: 18+ for MyScript SDK compatibility
- **TypeScript**: 4.9+ for type safety
- **Express.js**: Current framework compatibility
- **Axios**: For HTTP requests to MyScript Cloud API
- **FormData**: For multipart form data handling
- **Buffer**: For image data handling in Node.js

### Frontend Requirements
- **React**: 19+ for current implementation
- **Canvas API**: For handwriting capture
- **Touch/Pointer Events**: For mobile/tablet input support
- **MyScript Web SDK**: For real-time recognition
- **Tailwind CSS**: For UI component styling

### Infrastructure Dependencies
- **MyScript Account**: Developer credentials required
- **Network Access**: Outbound HTTPS to MyScript services
- **Additional Storage**: Temporary image storage
- **Caching Layer**: Redis for API response caching
- **Monitoring Tools**: API availability tracking

## Implementation Guide

### Frontend Integration

#### 1. Install Dependencies
```bash
npm install myscript
```

#### 2. Create Handwriting Input Component
```tsx
// frontend/src/components/HandwritingInput.tsx
import React, { useRef, useEffect, useState } from 'react';
import { myScript } from 'myscript';

interface HandwritingInputProps {
  onTextRecognized: (text: string) => void;
  language: string; // For multilingual support
}

const HandwritingInput: React.FC<HandwritingInputProps> = ({ onTextRecognized, language }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [editor, setEditor] = useState<any>(null);

  useEffect(() => {
    if (canvasRef.current) {
      // Initialize MyScript editor
      const newEditor = myScript.TextWebComponent.init({
        recognitionParams: {
          text: {
            type: "TEXT",
            language: language,
            convertionState: "DIGITAL_EDIT"
          }
        }
      });

      newEditor.registerWebComponent(canvasRef.current);

      // Event listener for when text is recognized
      newEditor.addEventListener('exported', (event: any) => {
        if (event.detail && event.detail.mimeType === 'application/x-latex') {
          onTextRecognized(event.detail.data);
        }
      });

      setEditor(newEditor);
    }

    return () => {
      if (editor) {
        editor.destroy();
      }
    };
  }, [language]);

  const handleClear = () => {
    if (editor) {
      editor.clear();
    }
  };

  return (
    <div className="handwriting-input">
      <canvas ref={canvasRef} width={800} height={400} />
      <div className="controls">
        <button onClick={handleClear}>Clear</button>
      </div>
    </div>
  );
};

export default HandwritingInput;
```

#### 3. Create Handwritten Input Modal
```tsx
// frontend/src/components/AIChat/HandwrittenInputModal.tsx
import React, { useState, useRef } from 'react';
import HandwritingInput from '../HandwritingInput';

interface HandwrittenInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (text: string) => void;
}

const HandwrittenInputModal: React.FC<HandwrittenInputModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const [recognizedText, setRecognizedText] = useState('');
  const [currentLanguage, setCurrentLanguage] = useState('en_US');

  if (!isOpen) return null;

  const handleTextRecognized = (text: string) => {
    setRecognizedText(text);
  };

  const handleSubmit = () => {
    if (recognizedText.trim()) {
      onSubmit(recognizedText);
      onClose();
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Handwritten Input</h3>
          <button onClick={onClose} className="close-button">X</button>
        </div>
        <div className="modal-body">
          <div className="language-selector">
            <label>Language: </label>
            <select 
              value={currentLanguage} 
              onChange={(e) => setCurrentLanguage(e.target.value)}
            >
              <option value="en_US">English</option>
              <option value="hi_IN">Hindi</option>
              <option value="mr_IN">Marathi</option>
              {/* Add more language options as supported by MyScript */}
            </select>
          </div>
          
          <HandwritingInput 
            onTextRecognized={handleTextRecognized} 
            language={currentLanguage}
          />
          
          <div className="recognized-text">
            <h4>Recognized Text:</h4>
            <textarea 
              value={recognizedText} 
              onChange={(e) => setRecognizedText(e.target.value)}
              rows={5}
              placeholder="Recognized text will appear here..."
            />
          </div>
        </div>
        <div className="modal-footer">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={handleSubmit} className="btn-primary" disabled={!recognizedText.trim()}>
            Submit
          </button>
        </div>
      </div>
    </div>
  );
};

export default HandwrittenInputModal;
```

### Backend Integration

#### 1. Create MyScript Service
```typescript
// backend/src/services/myscript.service.ts
import axios from 'axios';
import env from '../config/env';

export interface MyScriptConfig {
  applicationKey: string;
  hmacKey: string;
}

export interface MyScriptResponse {
  text: string;
  confidence: number;
  rawResponse: any;
}

export class MyScriptService {
  private readonly API_URL = 'https://cloud.myscript.com/api';
  private readonly APPLICATION_KEY: string;
  private readonly HMAC_KEY: string;

  constructor() {
    this.APPLICATION_KEY = env.MYSCRIPT_APPLICATION_KEY;
    this.HMAC_KEY = env.MYSCRIPT_HMAC_KEY;
  }

  /**
   * Process handwritten image using MyScript Cloud API
   */
  async processHandwrittenImage(
    imageBuffer: Buffer,
    mimeType: string = 'image/png',
    recognitionMode: 'TEXT' | 'MATH' | 'DIAGRAM' = 'TEXT'
  ): Promise<MyScriptResponse> {
    try {
      const formData = new FormData();
      
      // Add image file
      const blob = new Blob([imageBuffer], { type: mimeType });
      formData.append('image', blob, 'handwriting.png');

      // Add configuration parameters
      const config = {
        "applicationKey": this.APPLICATION_KEY,
        "configuration": {
          "text": {
            "type": recognitionMode,
            "language": "en_US" // This could be detected from your language service
          }
        }
      };

      const response = await axios.post(`${this.API_URL}/v4.0/recognition/rest/text`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'applicationKey': this.APPLICATION_KEY,
          'Accept': 'application/json',
        },
        timeout: 30000,
      });

      const result = response.data;
      return {
        text: this.extractText(result),
        confidence: this.calculateConfidence(result),
        rawResponse: result,
      };
    } catch (error) {
      console.error('MyScript processing error:', error);
      throw new Error(`MyScript processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private extractText(response: any): string {
    if (response && response.text) {
      return response.text;
    }
    if (response && response.recognition && response.recognition.text) {
      return response.recognition.text;
    }
    return '';
  }

  private calculateConfidence(response: any): number {
    // Calculate confidence based on MyScript response
    if (response && response.confidence) {
      return response.confidence;
    }
    return 0.5; // Default confidence
  }
}

export const myScriptService = new MyScriptService();
```

#### 2. Enhance OCR Service
```typescript
// backend/src/services/ocr.service.ts
import { myScriptService } from './myscript.service';
import { languageService } from './language.service';
import * as Tesseract from 'tesseract.js';

export class OCRService {
  /**
   * Enhanced text extraction that chooses between Tesseract and MyScript based on content type
   */
  async extractText(filePath: string, isHandwritten: boolean = false): Promise<string> {
    if (isHandwritten) {
      // Use MyScript for handwritten content
      const imageBuffer = require('fs').readFileSync(filePath);
      try {
        const result = await myScriptService.processHandwrittenImage(imageBuffer);
        return result.text;
      } catch (myscriptError) {
        console.warn('MyScript processing failed, falling back to Tesseract:', myscriptError);
        // Fallback to Tesseract if MyScript fails
        return this.extractWithTesseract(filePath);
      }
    } else {
      // Use Tesseract for printed text
      return this.extractWithTesseract(filePath);
    }
  }

  /**
   * Determine if an image is handwritten or printed
   */
  async isHandwrittenContent(imagePath: string): Promise<boolean> {
    // This could use image analysis to determine if content is handwritten
    // For now, we'll add a parameter to specify the content type
    // In a real implementation, you might use computer vision to detect handwriting
    
    // As a simple heuristic, we could check for common handwritten characteristics
    // or allow the user to specify the content type
    return false; // Default to not handwritten
  }

  /**
   * Extract text using Tesseract (existing functionality)
   */
  async extractWithTesseract(filePath: string): Promise<string> {
    const { data: { text } } = await Tesseract.recognize(filePath, 'eng', {
      logger: m => console.log(m),
    });
    return text;
  }

  /**
   * Check if file is an image type
   */
  isImageFile(mimeType: string): boolean {
    return [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/bmp',
      'image/webp'
    ].includes(mimeType);
  }
}

export const ocrService = new OCRService();
```

#### 3. Update Upload Controller
```typescript
// backend/src/controllers/upload.controller.ts (enhanced)
import { ocrService } from '../services/ocr.service';
import { myScriptService } from '../services/myscript.service';

export class UploadController {
  // ... existing methods ...

  async uploadFile(req: Request, res: Response): Promise<void> {
    try {
      if (!req.file) {
        res.status(400).json({
          success: false,
          error: 'No file uploaded',
        });
        return;
      }

      const file = req.file;
      const fileId = uuidv4();
      const userId = req.body.userId || 'default-user';
      const sessionId = req.body.sessionId || 'default-session';
      const isHandwritten = req.body.isHandwritten === 'true'; // New parameter

      console.log(`Processing file: ${file.originalname} (${file.mimetype}) for user: ${userId}, session: ${sessionId}`);

      const chromaCollectionName = await chatService.getChromaCollectionName(userId, sessionId);

      let allChunks: any[] = [];

      if (file.mimetype === SUPPORTED_FILE_TYPES.PDF) {
        // ... existing PDF processing ...
      } else if (ocrService.isImageFile(file.mimetype)) {
        // Enhanced image processing that supports both printed and handwritten content
        let extractedText = '';
        
        if (isHandwritten) {
          // Process with MyScript for handwritten content
          const imageBuffer = require('fs').readFileSync(file.path);
          try {
            console.log(`Processing handwritten image with MyScript: ${file.originalname}`);
            const myScriptResult = await myScriptService.processHandwrittenImage(
              imageBuffer, 
              file.mimetype,
              'TEXT' // Could be 'MATH' for mathematical expressions
            );
            extractedText = myScriptResult.text;
            console.log(`MyScript extracted ${extractedText.length} characters`);
          } catch (myscriptError) {
            console.warn('MyScript processing failed, falling back to Tesseract:', myscriptError);
            extractedText = await ocrService.extractWithTesseract(file.path);
          }
        } else {
          // Process with Tesseract for printed content
          console.log(`Processing printed image with Tesseract: ${file.originalname}`);
          extractedText = await ocrService.extractWithTesseract(file.path);
        }

        const imageLanguageDetection = languageService.detectLanguage(extractedText);
        console.log(`🌐 Detected image language: ${imageLanguageDetection.language} (${imageLanguageDetection.languageCode})`);

        await documentService.storeDocument(
          fileId,
          file.originalname,
          extractedText,
          userId,
          sessionId,
          imageLanguageDetection.languageCode
        );

        const chunks = await chunkingService.createChunks(
          extractedText,
          file.originalname,
          fileId,
          1,
          userId
        );
        allChunks.push(...chunks);
      }

      // ... continue with existing embedding and vector DB storage ...
    } catch (error) {
      // ... existing error handling ...
    }
  }
}
```

#### 4. Update Environment Configuration
```typescript
// backend/src/config/env.ts (additions)
export const env: EnvConfig = {
  // ... existing config ...
  
  // MyScript
  MYSCRIPT_APPLICATION_KEY: getEnvVariable("MYSCRIPT_APPLICATION_KEY"),
  MYSCRIPT_HMAC_KEY: getEnvVariable("MYSCRIPT_HMAC_KEY"),
  
  // ... rest of config
};
```

## API Documentation

### MyScript Service API
- **MyScriptService.processHandwrittenImage()**: Process handwritten image and return text
- **Parameters**: imageBuffer, mimeType, recognitionMode
- **Returns**: MyScriptResponse with text, confidence, and raw response

### Enhanced OCR Service API
- **OCRService.extractText()**: Enhanced extraction with MyScript/Tesseract choice
- **Parameters**: filePath, isHandwritten flag
- **Returns**: Extracted text string

### Frontend API Calls
- **HandwritingInput component**: Real-time recognition in browser
- **Modal submission**: Send recognized text to backend

## Security Considerations

### API Key Management
- Store MyScript API keys in environment variables
- Never commit API keys to source code
- Implement key rotation procedures
- Use secure credential management systems

### Data Privacy
- Ensure all handwritten data sent to MyScript complies with privacy regulations
- Understand MyScript's data retention policies
- Implement proper user consent for handwriting processing
- Log data access for compliance tracking

### Network Security
- Use HTTPS for all MyScript API communications
- Validate certificates for API endpoints
- Implement proper input sanitization
- Monitor for API abuse patterns

## Performance Guidelines

### Response Time Targets
- Real-time Web SDK: < 100ms per character
- Cloud API processing: < 3 seconds per image
- Fallback processing: < 5 seconds total
- UI component loading: < 2 seconds

### Scalability Measures
- Implement API rate limiting
- Add caching for common handwriting patterns
- Optimize image compression before API calls
- Queue large volume requests
- Monitor concurrent user limits

### Resource Optimization
- Efficient image buffer management
- Memory leak prevention in canvas components
- Batch processing for multiple images
- Intelligent fallback to Tesseract

## Testing Strategy

### Unit Tests
- Test MyScript service API calls
- Validate OCR service fallback logic
- Verify language detection with handwritten content
- Test error handling and edge cases

### Integration Tests
- End-to-end handwritten content processing
- API communication with MyScript services
- Database storage of processed content
- UI component functionality

### Performance Tests
- Load testing with concurrent handwritten requests
- Response time monitoring
- Memory usage analysis
- API availability verification

### Cross-browser Testing
- Canvas API compatibility
- Touch/pointer event handling
- MyScript Web SDK functionality
- Mobile device support

## Deployment Checklist

### Pre-deployment
- [ ] Obtain MyScript developer credentials
- [ ] Update environment variables with API keys
- [ ] Test MyScript API connectivity
- [ ] Verify fallback mechanisms
- [ ] Update monitoring configurations
- [ ] Test with various handwriting samples

### Deployment Steps
1. Deploy updated backend services
2. Deploy updated frontend components
3. Verify MyScript API integration
4. Test document upload with handwritten content
5. Validate existing functionality remains intact
6. Monitor API usage and performance

### Post-deployment
- Monitor MyScript API usage
- Track error rates and fallbacks
- Verify handwritten content processing
- Gather user feedback
- Optimize performance based on usage patterns

## Troubleshooting

### Common Issues
- **API Key Authentication**: Verify API keys are correctly set
- **Network Connectivity**: Check outbound HTTPS access to MyScript
- **Image Format Issues**: Validate supported image formats
- **Performance Degradation**: Monitor API response times

### Error Handling
- Implement graceful fallback to Tesseract
- Log detailed error information
- Provide user-friendly error messages
- Monitor API rate limits

### Debugging Tools
- Console logging for API interactions
- Network tab inspection for API calls
- Canvas debugging tools
- Performance monitoring dashboards

### Fallback Procedures
- Automatic switch to Tesseract when MyScript fails
- User notification of processing method
- Error recovery mechanisms
- Graceful degradation of features

---

## Additional Resources

### MyScript Documentation
- [MyScript Developer Portal](https://developer.myscript.com/)
- [Web SDK Documentation](https://developer.myscript.com/web-sdk)
- [Cloud API Documentation](https://developer.myscript.com/cloud-api)

### Support Channels
- MyScript Developer Support
- Community forums
- Implementation guides
- Best practices documentation