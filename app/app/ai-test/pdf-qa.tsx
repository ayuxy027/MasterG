import PDFExtractor from '@/components/PDFExtractor';
import { useAI } from '@/hooks/useAI';
import CameraOCRService from '@/services/ai/CameraOCRService';
import { PDFJSExtractionResult, readPDFAsBase64 } from '@/services/ai/PDFJSExtractorService';
import PDFQAService from '@/services/ai/PDFQAService';
import { PDFDocument } from '@/types/ai.types';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { Stack } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    sources?: string[];
}

export default function PDFQAScreen() {
    const { processDocument, askQuestion, isLoading, isTextModelReady } = useAI();
    const [activeDoc, setActiveDoc] = useState<PDFDocument | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputText, setInputText] = useState('');
    const [processing, setProcessing] = useState(false);
    const [showPasteMode, setShowPasteMode] = useState(false);
    const [pastedText, setPastedText] = useState('');

    // PDF.js extraction state
    const [pdfBase64, setPdfBase64] = useState<string | null>(null);
    const [pendingPdfName, setPendingPdfName] = useState<string>('');
    const [extractionStatus, setExtractionStatus] = useState<string>('');

    // Handle PDF.js extraction result
    const handlePDFJSExtraction = useCallback(async (result: PDFJSExtractionResult) => {
        console.log('📄 PDF.js extraction complete:', {
            success: result.success,
            charCount: result.charCount,
            error: result.error
        });

        if (result.success && result.text.length > 50) {
            // Successfully extracted text - create document
            try {
                const pdfService = PDFQAService.getInstance();
                const doc = await pdfService.createFromText(result.text, pendingPdfName);

                setActiveDoc(doc);
                setMessages([{
                    id: 'system',
                    role: 'assistant',
                    content: `✅ PDF.js extracted ${result.charCount} characters from "${pendingPdfName}".\n\nReady to answer questions!`,
                }]);

                console.log('✅ Document created from PDF.js extraction');
            } catch (error) {
                Alert.alert('Error', 'Failed to process extracted text: ' + (error as Error).message);
            }
        } else {
            // Extraction failed - show helpful message
            Alert.alert(
                'PDF Extraction Issue',
                result.error || 'Could not extract text. The PDF may be image-based.\n\nTry using "Scan with Camera" instead.',
                [
                    { text: 'OK' },
                    { text: 'Use Camera', onPress: handleCameraScan }
                ]
            );
        }

        // Clean up
        setPdfBase64(null);
        setPendingPdfName('');
        setProcessing(false);
        setExtractionStatus('');
    }, [pendingPdfName]);

    const handlePickDocument = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: 'application/pdf',
                copyToCacheDirectory: true,
            });

            if (result.canceled) return;

            const file = result.assets[0];
            setProcessing(true);
            setExtractionStatus('Reading PDF file...');

            try {
                // Read PDF as base64 for PDF.js extraction
                console.log('📄 Starting PDF.js extraction for:', file.name);
                const base64 = await readPDFAsBase64(file.uri);

                // Set state to trigger WebView rendering
                setPendingPdfName(file.name);
                setPdfBase64(base64);
                setExtractionStatus('Extracting text with PDF.js...');

                // The PDFExtractor component will handle the rest
                // and call handlePDFJSExtraction when done

            } catch (error) {
                setProcessing(false);
                Alert.alert('Error', 'Failed to read PDF: ' + (error as Error).message);
            }

        } catch (error) {
            Alert.alert('Error', 'Failed to pick document: ' + (error as Error).message);
        }
    };

    const handlePasteTextSubmit = async () => {
        if (!pastedText.trim() || pastedText.length < 50) {
            Alert.alert('Error', 'Please paste at least 50 characters of text.');
            return;
        }

        setProcessing(true);

        try {
            // Create a virtual document from pasted text
            const pdfService = PDFQAService.getInstance();
            const doc = await pdfService.createFromText(pastedText, 'Pasted Document');

            setActiveDoc(doc);
            setShowPasteMode(false);
            setPastedText('');
            setMessages([
                {
                    id: 'system',
                    role: 'assistant',
                    content: `Ready to answer questions about your pasted text (${pastedText.length} characters).`,
                },
            ]);
        } catch (error) {
            Alert.alert('Error', 'Failed to process text: ' + (error as Error).message);
        } finally {
            setProcessing(false);
        }
    };

    // Camera Scan - Take photo and extract text using ML Kit OCR
    const handleCameraScan = async () => {
        try {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Needed', 'Camera permission is required to scan documents.');
                return;
            }

            setProcessing(true);
            console.log('📷 Starting camera scan for Q&A...');

            // Take photo
            const result = await ImagePicker.launchCameraAsync({
                quality: 1,
                allowsEditing: false,
            });

            if (result.canceled) {
                setProcessing(false);
                return;
            }

            const imageUri = result.assets[0].uri;
            console.log('📷 Photo taken, starting OCR...');

            // Extract text using ML Kit
            const ocrService = CameraOCRService.getInstance();
            const ocrResult = await ocrService.extractTextFromImage(imageUri);

            if (ocrResult.text.length < 30) {
                Alert.alert(
                    'No Text Found',
                    'Could not find enough readable text.\n\nTips:\n• Use good lighting\n• Hold camera steady\n• Make sure text is clear and in focus'
                );
                setProcessing(false);
                return;
            }

            // ===== DETAILED LOGGING OF ALL EXTRACTED TEXT =====
            console.log('\n' + '='.repeat(70));
            console.log('🔍 CAMERA OCR EXTRACTION COMPLETE');
            console.log('='.repeat(70));
            console.log(`📊 Statistics:`);
            console.log(`   - Word Count: ${ocrResult.wordCount}`);
            console.log(`   - Character Count: ${ocrResult.text.length}`);
            console.log(`   - Block Count: ${ocrResult.blockCount}`);
            console.log(`   - Confidence: ${Math.round(ocrResult.confidence * 100)}%`);
            console.log('-'.repeat(70));
            console.log('📄 FULL EXTRACTED TEXT:');
            console.log('-'.repeat(70));
            console.log(ocrResult.text);
            console.log('-'.repeat(70));
            console.log('📄 END OF EXTRACTED TEXT');
            console.log('='.repeat(70) + '\n');

            // Create document from extracted text
            const pdfService = PDFQAService.getInstance();
            console.log('📚 Creating document from extracted text...');
            const doc = await pdfService.createFromText(ocrResult.text, 'Scanned Document');
            console.log('✅ Document created with ID:', doc.id);

            setActiveDoc(doc);
            setMessages([
                {
                    id: 'system',
                    role: 'assistant',
                    content: `Ready to answer questions about your scanned document (${ocrResult.wordCount} words extracted).`,
                },
            ]);

        } catch (error) {
            console.error('❌ Camera scan failed:', error);
            Alert.alert('Scan Failed', (error as Error).message);
        } finally {
            setProcessing(false);
        }
    };

    const handleSend = async () => {
        if (!inputText.trim() || !activeDoc) return;

        if (!isTextModelReady) {
            Alert.alert('Model Not Ready', 'Please initialize the AI engine first.');
            return;
        }

        const question = inputText.trim();
        setInputText('');

        // Add user message
        const userMsg: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: question,
        };
        setMessages(prev => [...prev, userMsg]);

        try {
            // Add placeholder thinking message
            const thinkingId = 'thinking';
            setMessages(prev => [...prev, { id: thinkingId, role: 'assistant', content: 'Thinking...' }]);

            const response = await askQuestion({
                question,
                documentId: activeDoc.id,
            });

            // Replace thinking with actual answer
            setMessages(prev => prev.map(msg =>
                msg.id === thinkingId ? {
                    id: Date.now().toString(),
                    role: 'assistant',
                    content: response.answer,
                    sources: response.sources.map(s => `Page ${s.page}`),
                } : msg
            ));

        } catch (error) {
            setMessages(prev => prev.filter(msg => msg.id !== 'thinking'));
            Alert.alert('Error', 'Failed to get answer: ' + (error as Error).message);
        }
    };

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ title: 'Document Q&A' }} />

            {/* Hidden PDF.js Extractor WebView */}
            {pdfBase64 && (
                <PDFExtractor
                    pdfBase64={pdfBase64}
                    onExtracted={handlePDFJSExtraction}
                    onStatus={setExtractionStatus}
                    debug={false} // Set to true to see WebView for debugging
                />
            )}

            {!activeDoc ? (
                <ScrollView contentContainerStyle={styles.centerContent}>
                    {!showPasteMode ? (
                        <>
                            {/* PDF Upload Option - Now with PDF.js! */}
                            <TouchableOpacity
                                style={styles.uploadButton}
                                onPress={handlePickDocument}
                                disabled={processing}
                            >
                                {processing ? (
                                    <>
                                        <ActivityIndicator color="#4f46e5" size="large" />
                                        <Text style={[styles.uploadText, { marginTop: 12 }]}>
                                            {extractionStatus || 'Processing PDF...'}
                                        </Text>
                                    </>
                                ) : (
                                    <Ionicons name="document-text-outline" size={48} color="#4f46e5" />
                                )}
                                {!processing && (
                                    <Text style={styles.uploadText}>
                                        Select a PDF Document
                                    </Text>
                                )}
                                <Text style={styles.uploadSubtext}>
                                    🔌 Works OFFLINE • PDF.js (90%+ success)
                                </Text>
                            </TouchableOpacity>

                            <View style={styles.divider}>
                                <View style={styles.dividerLine} />
                                <Text style={styles.dividerText}>OR</Text>
                                <View style={styles.dividerLine} />
                            </View>

                            {/* Paste Text Option */}
                            <TouchableOpacity
                                style={[styles.uploadButton, styles.pasteButton]}
                                onPress={() => setShowPasteMode(true)}
                            >
                                <Ionicons name="clipboard-outline" size={48} color="#10b981" />
                                <Text style={[styles.uploadText, styles.pasteText]}>Paste Text Directly</Text>
                                <Text style={styles.uploadSubtext}>
                                    ✅ Guaranteed to work!
                                </Text>
                            </TouchableOpacity>

                            <View style={styles.divider}>
                                <View style={styles.dividerLine} />
                                <Text style={styles.dividerText}>OR</Text>
                                <View style={styles.dividerLine} />
                            </View>

                            {/* Camera Scan Option - NEW! */}
                            <TouchableOpacity
                                style={[styles.uploadButton, styles.scanButton]}
                                onPress={handleCameraScan}
                                disabled={processing}
                            >
                                {processing ? (
                                    <ActivityIndicator color="#f59e0b" size="large" />
                                ) : (
                                    <Ionicons name="camera-outline" size={48} color="#f59e0b" />
                                )}
                                <Text style={[styles.uploadText, styles.scanText]}>📷 Scan with Camera</Text>
                                <Text style={styles.uploadSubtext}>
                                    Take photo → ML Kit OCR → Q&A
                                </Text>
                            </TouchableOpacity>
                        </>
                    ) : (
                        /* Paste Text Input Mode */
                        <View style={styles.pasteContainer}>
                            <Text style={styles.pasteTitle}>Paste Your Document Text</Text>
                            <Text style={styles.pasteSubtitle}>
                                Copy text from any document and paste it below
                            </Text>

                            <TextInput
                                style={styles.pasteInput}
                                placeholder="Paste your document text here..."
                                value={pastedText}
                                onChangeText={setPastedText}
                                multiline
                                textAlignVertical="top"
                            />

                            <Text style={styles.charCount}>
                                {pastedText.length} characters ({pastedText.length < 50 ? 'need 50+' : '✓ ready'})
                            </Text>

                            <View style={styles.pasteActions}>
                                <TouchableOpacity
                                    style={styles.cancelButton}
                                    onPress={() => {
                                        setShowPasteMode(false);
                                        setPastedText('');
                                    }}
                                >
                                    <Text style={styles.cancelButtonText}>Cancel</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[styles.submitButton, pastedText.length < 50 && styles.submitButtonDisabled]}
                                    onPress={handlePasteTextSubmit}
                                    disabled={pastedText.length < 50 || processing}
                                >
                                    {processing ? (
                                        <ActivityIndicator color="white" size="small" />
                                    ) : (
                                        <Text style={styles.submitButtonText}>Start Q&A</Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}
                </ScrollView>
            ) : (
                <View style={styles.chatContainer}>
                    <View style={styles.header}>
                        <View>
                            <Text style={styles.docName} numberOfLines={1}>{activeDoc.name}</Text>
                            <Text style={styles.docInfo}>{activeDoc.pageCount} pages • {Object.keys(activeDoc.index.keywords).length} keywords</Text>
                        </View>
                        <TouchableOpacity onPress={() => setActiveDoc(null)}>
                            <Ionicons name="close-circle" size={24} color="#6b7280" />
                        </TouchableOpacity>
                    </View>

                    <FlatList
                        data={messages}
                        keyExtractor={item => item.id}
                        contentContainerStyle={styles.messageList}
                        renderItem={({ item }) => (
                            <View style={[
                                styles.messageBubble,
                                item.role === 'user' ? styles.userBubble : styles.assistantBubble
                            ]}>
                                <Text style={[
                                    styles.messageText,
                                    item.role === 'user' ? styles.userText : styles.assistantText
                                ]}>{item.content}</Text>

                                {item.sources && item.sources.length > 0 && (
                                    <View style={styles.sourcesContainer}>
                                        <Text style={styles.sourceLabel}>Sources:</Text>
                                        {item.sources.map((source, idx) => (
                                            <View key={idx} style={styles.sourceTag}>
                                                <Text style={styles.sourceText}>{source}</Text>
                                            </View>
                                        ))}
                                    </View>
                                )}
                            </View>
                        )}
                    />

                    <View style={styles.inputArea}>
                        <TextInput
                            style={styles.input}
                            placeholder="Ask a question..."
                            value={inputText}
                            onChangeText={setInputText}
                            multiline
                        />
                        <TouchableOpacity
                            style={[
                                styles.sendButton,
                                (!inputText.trim() || isLoading) && styles.sendButtonDisabled
                            ]}
                            onPress={handleSend}
                            disabled={!inputText.trim() || isLoading}
                        >
                            {isLoading ? (
                                <ActivityIndicator color="white" size="small" />
                            ) : (
                                <Ionicons name="send" size={20} color="white" />
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f3f4f6',
    },
    centerContent: {
        flex: 1,
        padding: 20,
        justifyContent: 'center',
    },
    uploadButton: {
        backgroundColor: 'white',
        padding: 32,
        borderRadius: 16,
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#4f46e5',
        borderStyle: 'dashed',
        marginBottom: 16,
    },
    uploadText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#4f46e5',
        marginTop: 12,
    },
    uploadSubtext: {
        fontSize: 14,
        color: '#9ca3af',
        marginTop: 4,
    },
    divider: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 16,
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: '#d1d5db',
    },
    dividerText: {
        paddingHorizontal: 16,
        color: '#6b7280',
        fontSize: 14,
    },
    pasteButton: {
        borderColor: '#10b981',
    },
    pasteText: {
        color: '#10b981',
    },
    scanButton: {
        borderColor: '#f59e0b',
    },
    scanText: {
        color: '#f59e0b',
    },
    pasteContainer: {
        padding: 20,
    },
    pasteTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1f2937',
        marginBottom: 8,
    },
    pasteSubtitle: {
        fontSize: 14,
        color: '#6b7280',
        marginBottom: 16,
    },
    pasteInput: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 16,
        height: 200,
        borderWidth: 1,
        borderColor: '#d1d5db',
        fontSize: 15,
    },
    charCount: {
        textAlign: 'right',
        color: '#6b7280',
        fontSize: 12,
        marginTop: 4,
    },
    pasteActions: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 16,
    },
    cancelButton: {
        flex: 1,
        padding: 16,
        borderRadius: 12,
        backgroundColor: '#f3f4f6',
        alignItems: 'center',
    },
    cancelButtonText: {
        color: '#6b7280',
        fontWeight: '600',
    },
    submitButton: {
        flex: 2,
        padding: 16,
        borderRadius: 12,
        backgroundColor: '#10b981',
        alignItems: 'center',
    },
    submitButtonDisabled: {
        backgroundColor: '#d1d5db',
    },
    submitButtonText: {
        color: 'white',
        fontWeight: 'bold',
    },
    chatContainer: {
        flex: 1,
    },
    docHeader: {
        backgroundColor: 'white',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
    },
    docTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1f2937',
    },
    docInfo: {
        fontSize: 12,
        color: '#6b7280',
        marginTop: 4,
    },
    messagesList: {
        flex: 1,
        padding: 16,
    },
    messageRow: {
        marginBottom: 12,
    },
    userRow: {
        alignItems: 'flex-end',
    },
    assistantRow: {
        alignItems: 'flex-start',
    },
    messageBubble: {
        maxWidth: '80%',
        padding: 12,
        borderRadius: 16,
    },
    userBubble: {
        backgroundColor: '#4f46e5',
        borderBottomRightRadius: 4,
    },
    assistantBubble: {
        backgroundColor: 'white',
        borderBottomLeftRadius: 4,
    },
    userText: {
        color: 'white',
        fontSize: 15,
    },
    assistantText: {
        color: '#1f2937',
        fontSize: 15,
    },
    sources: {
        marginTop: 8,
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 4,
    },
    sourceTag: {
        backgroundColor: '#dbeafe',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    sourceText: {
        fontSize: 10,
        color: '#1e40af',
    },
    changeDocButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    changeDocText: {
        fontSize: 12,
        color: '#4f46e5',
    },
    inputContainer: {
        flexDirection: 'row',
        padding: 12,
        backgroundColor: 'white',
        borderTopWidth: 1,
        borderTopColor: '#e5e7eb',
        alignItems: 'flex-end',
        gap: 12,
    },
    textInput: {
        flex: 1,
        backgroundColor: '#f3f4f6',
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 10,
        maxHeight: 100,
        fontSize: 15,
    },
    sendButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#4f46e5',
        justifyContent: 'center',
        alignItems: 'center',
    },
    sendButtonDisabled: {
        backgroundColor: '#c7d2fe',
    },
    // Additional styles for chat view
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
    },
    docName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1f2937',
    },
    messageList: {
        padding: 16,
    },
    messageText: {
        fontSize: 15,
    },
    sourcesContainer: {
        marginTop: 8,
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 4,
    },
    sourceLabel: {
        fontSize: 12,
        color: '#6b7280',
        marginRight: 4,
    },
    inputArea: {
        flexDirection: 'row',
        padding: 12,
        backgroundColor: 'white',
        borderTopWidth: 1,
        borderTopColor: '#e5e7eb',
        alignItems: 'flex-end',
        gap: 12,
    },
    input: {
        flex: 1,
        backgroundColor: '#f3f4f6',
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 10,
        maxHeight: 100,
        fontSize: 15,
    },
});
