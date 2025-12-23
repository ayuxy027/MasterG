/**
 * Camera OCR Service
 * Uses ML Kit Text Recognition for extracting text from images
 * 
 * Dependencies (already installed):
 * - @react-native-ml-kit/text-recognition
 * - expo-image-picker
 */

import TextRecognition from '@react-native-ml-kit/text-recognition';
import * as ImagePicker from 'expo-image-picker';

export interface OCRResult {
    text: string;
    confidence: number;
    blockCount: number;
    wordCount: number;
}

class CameraOCRService {
    private static instance: CameraOCRService;

    static getInstance(): CameraOCRService {
        if (!CameraOCRService.instance) {
            CameraOCRService.instance = new CameraOCRService();
        }
        return CameraOCRService.instance;
    }

    /**
     * Take photo with camera and extract text
     */
    async captureAndExtract(): Promise<OCRResult> {
        try {
            console.log('📷 Launching camera...');

            // Request camera permission
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') {
                throw new Error('Camera permission is required to scan documents');
            }

            // Launch camera
            const result = await ImagePicker.launchCameraAsync({
                quality: 1,
                allowsEditing: false,
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
            });

            if (result.canceled) {
                throw new Error('Camera cancelled');
            }

            const imageUri = result.assets[0].uri;
            console.log('📷 Photo taken, processing with ML Kit...');

            // Extract text using ML Kit
            return await this.extractTextFromImage(imageUri);

        } catch (error) {
            console.error('❌ Camera OCR failed:', error);
            throw error;
        }
    }

    /**
     * Select image from gallery and extract text
     */
    async extractFromGallery(): Promise<OCRResult> {
        try {
            console.log('🖼️ Opening gallery...');

            const result = await ImagePicker.launchImageLibraryAsync({
                quality: 1,
                allowsEditing: false,
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
            });

            if (result.canceled) {
                throw new Error('Gallery selection cancelled');
            }

            const imageUri = result.assets[0].uri;
            console.log('🖼️ Image selected, processing with ML Kit...');

            return await this.extractTextFromImage(imageUri);

        } catch (error) {
            console.error('❌ Gallery OCR failed:', error);
            throw error;
        }
    }

    /**
     * Extract text from image using ML Kit
     * Logs ALL extracted text to console for debugging
     */
    async extractTextFromImage(imageUri: string): Promise<OCRResult> {
        try {
            console.log('\n' + '='.repeat(60));
            console.log('🔍 ML Kit Text Recognition Starting...');
            console.log('='.repeat(60));
            console.log('📷 Input URI:', imageUri);

            // Ensure proper URI format for Android
            let processedUri = imageUri;
            if (!imageUri.startsWith('file://') && !imageUri.startsWith('content://')) {
                processedUri = `file://${imageUri}`;
            }

            const startTime = Date.now();

            // Call ML Kit
            const recognitionResult = await TextRecognition.recognize(processedUri);

            const processingTime = Date.now() - startTime;
            console.log(`⏱️ OCR completed in ${processingTime}ms`);

            // Check if result is valid
            if (!recognitionResult || !recognitionResult.blocks) {
                console.log('⚠️ No recognition result returned');
                return { text: '', confidence: 0, blockCount: 0, wordCount: 0 };
            }

            const textBlocks = recognitionResult.blocks;
            console.log(`\n📦 Found ${textBlocks.length} text blocks`);

            if (textBlocks.length === 0) {
                console.log('⚠️ No text blocks found in image');
                return { text: '', confidence: 0, blockCount: 0, wordCount: 0 };
            }

            // Log EVERY block with FULL text
            console.log('\n' + '-'.repeat(60));
            console.log('📝 EXTRACTED TEXT (ALL BLOCKS):');
            console.log('-'.repeat(60));

            const allTexts: string[] = [];
            textBlocks.forEach((block, idx) => {
                const blockText = block.text || '';
                console.log(`\n[Block ${idx + 1}]:`);
                console.log(blockText);
                allTexts.push(blockText);
            });

            // Join and clean the text
            let fullText = allTexts.join('\n\n');

            // Clean up the text - remove extra whitespace, normalize
            fullText = this.cleanExtractedText(fullText);

            // Log the FULL cleaned text
            console.log('\n' + '-'.repeat(60));
            console.log('📄 FULL CLEANED TEXT:');
            console.log('-'.repeat(60));
            console.log(fullText);
            console.log('-'.repeat(60));

            // Count stats
            const wordCount = fullText.split(/\s+/).filter(w => w.length > 0).length;
            const charCount = fullText.length;
            const lineCount = fullText.split('\n').length;

            console.log(`\n📊 STATS:`);
            console.log(`   Words: ${wordCount}`);
            console.log(`   Characters: ${charCount}`);
            console.log(`   Lines: ${lineCount}`);
            console.log(`   Blocks: ${textBlocks.length}`);
            console.log('='.repeat(60) + '\n');

            return {
                text: fullText,
                confidence: 0.85,
                blockCount: textBlocks.length,
                wordCount: wordCount,
            };

        } catch (error) {
            console.error('\n❌ ML Kit OCR FAILED!');
            console.error('Error:', (error as Error).message);
            console.error('Full error:', error);
            throw new Error(`OCR failed: ${(error as Error).message}`);
        }
    }

    /**
     * Clean and optimize extracted text
     */
    private cleanExtractedText(text: string): string {
        return text
            // Remove multiple spaces
            .replace(/  +/g, ' ')
            // Remove multiple newlines (keep max 2)
            .replace(/\n{3,}/g, '\n\n')
            // Trim each line
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0)
            .join('\n')
            // Final trim
            .trim();
    }

    /**
     * Process multiple images (for multi-page documents)
     */
    async extractFromMultipleImages(imageUris: string[]): Promise<OCRResult> {
        try {
            console.log(`📚 Processing ${imageUris.length} pages...`);

            const allText: string[] = [];
            let totalBlocks = 0;
            let totalWords = 0;

            for (let i = 0; i < imageUris.length; i++) {
                console.log(`📄 Processing page ${i + 1}/${imageUris.length}...`);

                const result = await this.extractTextFromImage(imageUris[i]);
                allText.push(`--- Page ${i + 1} ---\n${result.text}`);
                totalBlocks += result.blockCount;
                totalWords += result.wordCount;
            }

            const fullText = allText.join('\n\n');

            return {
                text: fullText,
                confidence: 0.85,
                blockCount: totalBlocks,
                wordCount: totalWords,
            };

        } catch (error) {
            console.error('❌ Multi-page OCR failed:', error);
            throw error;
        }
    }

    /**
     * Quick test to verify ML Kit is working
     */
    async testOCR(imageUri: string): Promise<boolean> {
        try {
            console.log('🧪 Testing ML Kit...');
            const result = await TextRecognition.recognize(imageUri);
            const hasText = result.blocks && result.blocks.length > 0;
            console.log(hasText ? '✅ ML Kit working!' : '⚠️ No text found in test image');
            return true;
        } catch (error) {
            console.error('❌ ML Kit test failed:', error);
            return false;
        }
    }
}

export default CameraOCRService;
