/**
 * PDF OCR Fallback Component
 * 
 * Hidden component that renders PDF pages one by one,
 * captures screenshots, and runs ML Kit OCR on each page.
 * 
 * Used when PDF.js fails to extract text (image-based PDFs).
 */

import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import Pdf from 'react-native-pdf';
import ViewShot, { captureRef } from 'react-native-view-shot';
import { extractTextFromImageWithMLKit } from '../services/ai/SmartPDFPipeline';

interface PDFOCRFallbackProps {
    /** Path to the PDF file */
    pdfUri: string;
    /** Maximum pages to process (to avoid long waits) */
    maxPages?: number;
    /** Callback when OCR completes */
    onComplete: (result: { success: boolean; text: string; pageCount: number; error: string | null }) => void;
    /** Callback for status updates */
    onStatus?: (status: string) => void;
    /** Whether to show the component (for debugging) */
    debug?: boolean;
}

/**
 * Component that renders PDF pages and extracts text via OCR
 */
export function PDFOCRFallback({
    pdfUri,
    maxPages = 10,
    onComplete,
    onStatus,
    debug = false
}: PDFOCRFallbackProps) {
    const viewShotRef = useRef<ViewShot>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const [processing, setProcessing] = useState(false);
    const [pageReady, setPageReady] = useState(false);
    const hasCompleted = useRef(false);

    // Use ref for extracted texts to avoid stale state issues
    const extractedTextsRef = useRef<string[]>([]);
    const [displayCount, setDisplayCount] = useState(0); // For UI update

    // Process current page when it's ready
    useEffect(() => {
        if (!pageReady || processing || hasCompleted.current) return;
        if (totalPages === 0) return;

        processCurrentPage();
    }, [pageReady, currentPage, totalPages]);

    const processCurrentPage = async () => {
        if (hasCompleted.current) return;

        setProcessing(true);
        onStatus?.(`🔍 OCR: Processing page ${currentPage} of ${Math.min(totalPages, maxPages)}...`);

        try {
            // Wait a bit for the page to render fully
            await new Promise(resolve => setTimeout(resolve, 500));

            // Capture the PDF page as an image
            if (viewShotRef.current) {
                const imageUri = await captureRef(viewShotRef, {
                    format: 'png',
                    quality: 1,
                    result: 'tmpfile'
                });

                console.log(`📸 Page ${currentPage} captured:`, imageUri);

                // Extract text using ML Kit
                const pageText = await extractTextFromImageWithMLKit(imageUri);

                if (pageText.trim()) {
                    // Use ref to avoid stale state
                    extractedTextsRef.current.push(`--- Page ${currentPage} ---\n${pageText}`);
                    setDisplayCount(extractedTextsRef.current.length);
                    console.log(`✅ Page ${currentPage}: ${pageText.length} characters extracted`);
                } else {
                    console.log(`⚠️ Page ${currentPage}: No text found`);
                }
            }
        } catch (error) {
            console.error(`❌ Error processing page ${currentPage}:`, error);
        }

        setProcessing(false);
        setPageReady(false);

        // Move to next page or complete
        const pagesToProcess = Math.min(totalPages, maxPages);
        if (currentPage < pagesToProcess) {
            setCurrentPage(currentPage + 1);
        } else {
            // All pages processed - complete!
            finishExtraction();
        }
    };

    const finishExtraction = () => {
        if (hasCompleted.current) return;
        hasCompleted.current = true;

        // Use ref value, not state!
        const combinedText = extractedTextsRef.current.join('\n\n');
        const pageCount = extractedTextsRef.current.length;
        const success = combinedText.length > 50;

        console.log(`📄 OCR Fallback complete: ${combinedText.length} chars from ${pageCount} pages`);

        onComplete({
            success,
            text: combinedText,
            pageCount: Math.min(totalPages, maxPages),
            error: success ? null : 'OCR could not extract meaningful text from the PDF'
        });
    };

    const handleLoadComplete = (numberOfPages: number) => {
        console.log(`📄 PDF loaded: ${numberOfPages} pages`);
        setTotalPages(numberOfPages);
        onStatus?.(`📄 PDF has ${numberOfPages} pages. Starting OCR...`);
    };

    const handlePageChanged = (page: number) => {
        console.log(`📖 PDF rendered page ${page}`);
        // Small delay to ensure page is fully rendered
        setTimeout(() => setPageReady(true), 300);
    };

    const handleError = (error: any) => {
        console.error('❌ PDF render error:', error);
        if (!hasCompleted.current) {
            hasCompleted.current = true;
            onComplete({
                success: false,
                text: '',
                pageCount: 0,
                error: 'Failed to render PDF for OCR: ' + (error?.message || 'Unknown error')
            });
        }
    };

    return (
        <View style={debug ? styles.debugContainer : styles.hiddenContainer}>
            <ViewShot ref={viewShotRef} style={styles.pdfContainer}>
                <Pdf
                    source={{ uri: pdfUri }}
                    page={currentPage}
                    scale={2.0}  // Higher scale for better OCR accuracy
                    onLoadComplete={handleLoadComplete}
                    onPageChanged={handlePageChanged}
                    onError={handleError}
                    style={styles.pdf}
                    enablePaging={true}
                    horizontal={false}
                    fitPolicy={2}  // fitWidth: fit page width to view
                />
            </ViewShot>

            {debug && (
                <View style={styles.debugInfo}>
                    <Text style={styles.debugText}>
                        Page {currentPage}/{totalPages} | Processing: {processing ? 'Yes' : 'No'}
                    </Text>
                    <Text style={styles.debugText}>
                        Extracted: {displayCount} pages
                    </Text>
                    {processing && <ActivityIndicator size="small" color="#4f46e5" />}
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    hiddenContainer: {
        position: 'absolute',
        width: 600,  // Wider for better capture
        height: 900, // Taller to fit full A4-ratio page
        left: -700,  // Off-screen
        top: 0,
    },
    debugContainer: {
        width: '100%',
        height: 500,
        borderWidth: 2,
        borderColor: '#4f46e5',
        marginVertical: 10,
    },
    pdfContainer: {
        width: 600,   // Wider capture area
        height: 850,  // A4 ratio height (600 * 1.414)
        backgroundColor: 'white',
    },
    pdf: {
        flex: 1,
        backgroundColor: 'white',
    },
    debugInfo: {
        padding: 10,
        backgroundColor: '#f0f0f0',
    },
    debugText: {
        fontSize: 12,
        color: '#333',
    },
});

export default PDFOCRFallback;
