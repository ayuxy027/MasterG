/**
 * PDF Extractor Component - OFFLINE VERSION
 * 
 * Hidden WebView component that uses bundled PDF.js to extract text from PDFs.
 * Uses locally bundled PDF.js for fully offline operation.
 * This is rendered as a hidden component and communicates via callbacks.
 */

import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import {
    generatePDFExtractorHTMLOffline,
    generatePDFExtractorHTMLOnline,
    parseExtractionResult,
    PDFJSExtractionResult
} from '../services/ai/PDFJSExtractorService';

interface PDFExtractorProps {
    /** Base64 encoded PDF data */
    pdfBase64: string;
    /** Callback when extraction completes */
    onExtracted: (result: PDFJSExtractionResult) => void;
    /** Callback for status updates */
    onStatus?: (status: string) => void;
    /** Whether to show the WebView (for debugging) */
    debug?: boolean;
    /** Force online mode (use CDN instead of bundled assets) */
    forceOnline?: boolean;
}

/**
 * Hidden WebView component that extracts text from PDF using bundled PDF.js
 * Supports fully offline operation!
 */
export function PDFExtractor({
    pdfBase64,
    onExtracted,
    onStatus,
    debug = false,
    forceOnline = false
}: PDFExtractorProps) {
    const webViewRef = useRef<WebView>(null);
    const hasExtracted = useRef(false);
    const [html, setHtml] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);

    // Load HTML asynchronously (for offline mode, need to load bundled assets)
    useEffect(() => {
        let mounted = true;
        hasExtracted.current = false;
        setLoading(true);
        setLoadError(null);

        async function loadHTML() {
            try {
                let generatedHtml: string;

                if (forceOnline) {
                    // Use CDN version
                    console.log('📡 Using online PDF.js (CDN)');
                    onStatus?.('Using online PDF.js...');
                    generatedHtml = generatePDFExtractorHTMLOnline(pdfBase64);
                } else {
                    // Try offline version first
                    console.log('📦 Loading offline PDF.js...');
                    onStatus?.('Loading bundled PDF.js...');
                    try {
                        generatedHtml = await generatePDFExtractorHTMLOffline(pdfBase64);
                        console.log('✅ Offline PDF.js HTML generated');
                    } catch (offlineError) {
                        // Fall back to online if offline fails
                        console.warn('⚠️ Offline PDF.js failed, falling back to CDN:', offlineError);
                        onStatus?.('Falling back to online PDF.js...');
                        generatedHtml = generatePDFExtractorHTMLOnline(pdfBase64);
                    }
                }

                if (mounted) {
                    setHtml(generatedHtml);
                    setLoading(false);
                    onStatus?.('Extracting text...');
                }
            } catch (error) {
                console.error('❌ Failed to generate PDF.js HTML:', error);
                if (mounted) {
                    setLoadError((error as Error).message);
                    setLoading(false);
                    onExtracted({
                        success: false,
                        text: '',
                        error: 'Failed to initialize PDF.js: ' + (error as Error).message,
                        charCount: 0
                    });
                }
            }
        }

        loadHTML();

        return () => {
            mounted = false;
        };
    }, [pdfBase64, forceOnline]);

    const handleMessage = (event: WebViewMessageEvent) => {
        if (hasExtracted.current) return; // Prevent duplicate callbacks

        try {
            const result = parseExtractionResult(event.nativeEvent.data);
            console.log('📄 PDF.js extraction result:', {
                success: result.success,
                charCount: result.charCount,
                error: result.error
            });

            hasExtracted.current = true;
            onExtracted(result);
        } catch (error) {
            console.error('❌ Failed to parse WebView message:', error);
            onExtracted({
                success: false,
                text: '',
                error: 'Failed to parse extraction result',
                charCount: 0
            });
        }
    };

    const handleError = (syntheticEvent: any) => {
        const { nativeEvent } = syntheticEvent;
        console.error('❌ WebView error:', nativeEvent);

        if (!hasExtracted.current) {
            hasExtracted.current = true;
            onExtracted({
                success: false,
                text: '',
                error: 'WebView failed to load: ' + (nativeEvent.description || 'Unknown error'),
                charCount: 0
            });
        }
    };

    // Show loading state while HTML is being generated
    if (loading) {
        if (debug) {
            return (
                <View style={styles.debugContainer}>
                    <ActivityIndicator size="large" color="#4f46e5" />
                    <Text style={styles.loadingText}>Loading PDF.js libraries...</Text>
                </View>
            );
        }
        return null;
    }

    // Show error if HTML generation failed
    if (loadError || !html) {
        if (debug) {
            return (
                <View style={styles.debugContainer}>
                    <Text style={styles.errorText}>❌ {loadError || 'Failed to load'}</Text>
                </View>
            );
        }
        return null;
    }

    return (
        <View style={debug ? styles.debugContainer : styles.hiddenContainer}>
            <WebView
                ref={webViewRef}
                source={{ html }}
                onMessage={handleMessage}
                onError={handleError}
                javaScriptEnabled={true}
                domStorageEnabled={true}
                originWhitelist={['*']}
                mixedContentMode="compatibility"
                style={debug ? styles.webview : styles.hidden}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    hiddenContainer: {
        position: 'absolute',
        width: 1,
        height: 1,
        opacity: 0,
        overflow: 'hidden',
    },
    debugContainer: {
        height: 300,
        borderWidth: 1,
        borderColor: '#ccc',
        marginVertical: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    hidden: {
        width: 1,
        height: 1,
    },
    webview: {
        flex: 1,
    },
    loadingText: {
        marginTop: 10,
        color: '#666',
        fontSize: 14,
    },
    errorText: {
        color: '#dc2626',
        fontSize: 14,
        textAlign: 'center',
        padding: 20,
    },
});

export default PDFExtractor;
