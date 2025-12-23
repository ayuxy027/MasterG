import CameraOCRService from '@/services/ai/CameraOCRService';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Stack } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface OCRScanResult {
    text: string;
    blockCount: number;
    wordCount: number;
    confidence: number;
}

export default function ScannerScreen() {
    const [image, setImage] = useState<string | null>(null);
    const [result, setResult] = useState<OCRScanResult | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    const ocrService = CameraOCRService.getInstance();

    const pickImage = async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: false,
                quality: 1,
            });

            if (!result.canceled) {
                setImage(result.assets[0].uri);
                setResult(null);
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to pick image');
        }
    };

    const takePhoto = async () => {
        try {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission needed', 'Camera permission is required');
                return;
            }

            const pickerResult = await ImagePicker.launchCameraAsync({
                allowsEditing: false,
                quality: 1,
            });

            if (!pickerResult.canceled) {
                setImage(pickerResult.assets[0].uri);
                setResult(null);
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to take photo');
        }
    };

    // Extract text using ML Kit OCR
    const handleOCRScan = async () => {
        if (!image) return;

        setIsProcessing(true);
        try {
            console.log('🔍 Starting ML Kit OCR...');
            const ocrResult = await ocrService.extractTextFromImage(image);

            if (ocrResult.text.length < 10) {
                Alert.alert(
                    'No Text Found',
                    'Could not find readable text in this image. Try:\n\n• Better lighting\n• Hold camera steady\n• Ensure text is in focus'
                );
                return;
            }

            setResult(ocrResult);
            console.log('✅ OCR completed successfully');

        } catch (error) {
            console.error('❌ OCR failed:', error);
            Alert.alert('OCR Failed', (error as Error).message);
        } finally {
            setIsProcessing(false);
        }
    };

    // Quick scan - take photo and immediately OCR
    const handleQuickScan = async () => {
        setIsProcessing(true);
        try {
            console.log('📷 Quick scan: taking photo...');
            const ocrResult = await ocrService.captureAndExtract();

            if (ocrResult.text.length < 10) {
                Alert.alert(
                    'No Text Found',
                    'Could not find readable text. Try with better lighting and focus.'
                );
                return;
            }

            // We don't have the image URI in quick scan, but that's ok
            setResult(ocrResult);
            console.log('✅ Quick scan completed');

        } catch (error) {
            if ((error as Error).message === 'Camera cancelled') {
                return; // User cancelled, don't show error
            }
            console.error('❌ Quick scan failed:', error);
            Alert.alert('Scan Failed', (error as Error).message);
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ title: 'Document Scanner (ML Kit OCR)' }} />

            <ScrollView contentContainerStyle={styles.content}>
                {/* Status Banner */}
                <View style={styles.statusBanner}>
                    <Ionicons name="checkmark-circle" size={18} color="#15803d" />
                    <Text style={styles.statusText}>
                        ML Kit OCR Ready • Works Offline
                    </Text>
                </View>

                {/* Quick Scan Button */}
                <TouchableOpacity
                    style={[styles.quickScanButton, isProcessing && styles.buttonDisabled]}
                    onPress={handleQuickScan}
                    disabled={isProcessing}
                >
                    {isProcessing ? (
                        <ActivityIndicator color="white" size="large" />
                    ) : (
                        <>
                            <Ionicons name="camera" size={32} color="white" />
                            <Text style={styles.quickScanText}>Quick Scan</Text>
                            <Text style={styles.quickScanSubtext}>Take photo & extract text instantly</Text>
                        </>
                    )}
                </TouchableOpacity>

                {/* OR divider */}
                <View style={styles.divider}>
                    <View style={styles.dividerLine} />
                    <Text style={styles.dividerText}>OR select image</Text>
                    <View style={styles.dividerLine} />
                </View>

                {/* Image Container */}
                <View style={styles.imageContainer}>
                    {image ? (
                        <Image source={{ uri: image }} style={styles.previewImage} resizeMode="contain" />
                    ) : (
                        <View style={styles.placeholder}>
                            <Ionicons name="image-outline" size={64} color="#9ca3af" />
                            <Text style={styles.placeholderText}>No image selected</Text>
                        </View>
                    )}

                    <View style={styles.buttonRow}>
                        <TouchableOpacity style={styles.actionButton} onPress={pickImage}>
                            <Ionicons name="images-outline" size={24} color="#374151" />
                            <Text style={styles.actionButtonText}>Gallery</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.actionButton} onPress={takePhoto}>
                            <Ionicons name="camera-outline" size={24} color="#374151" />
                            <Text style={styles.actionButtonText}>Camera</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Extract Text Button */}
                {image && (
                    <TouchableOpacity
                        style={[styles.scanButton, isProcessing && styles.buttonDisabled]}
                        onPress={handleOCRScan}
                        disabled={isProcessing}
                    >
                        {isProcessing ? (
                            <ActivityIndicator color="white" />
                        ) : (
                            <>
                                <Ionicons name="text" size={20} color="white" />
                                <Text style={styles.scanButtonText}>Extract Text (ML Kit)</Text>
                            </>
                        )}
                    </TouchableOpacity>
                )}

                {/* Results */}
                {result && (
                    <View style={styles.resultCard}>
                        <View style={styles.resultHeader}>
                            <Text style={styles.resultTitle}>Extracted Text</Text>
                            <View style={styles.statsBadge}>
                                <Text style={styles.statsText}>
                                    {result.wordCount} words • {result.blockCount} blocks
                                </Text>
                            </View>
                        </View>

                        <View style={styles.section}>
                            <Text style={styles.sectionLabel}>Confidence</Text>
                            <View style={styles.confidenceBar}>
                                <View style={[styles.confidenceFill, { width: `${result.confidence * 100}%` }]} />
                            </View>
                            <Text style={styles.confidenceText}>{Math.round(result.confidence * 100)}%</Text>
                        </View>

                        <View style={styles.section}>
                            <Text style={styles.sectionLabel}>Extracted Text</Text>
                            <ScrollView style={styles.textContainer} nestedScrollEnabled>
                                <Text style={styles.extractedText}>{result.text}</Text>
                            </ScrollView>
                        </View>

                        {/* Copy to clipboard would go here */}
                        <TouchableOpacity
                            style={styles.copyButton}
                            onPress={() => {
                                // You could add clipboard functionality here
                                Alert.alert('Text Extracted', `${result.wordCount} words extracted successfully!`);
                            }}
                        >
                            <Ionicons name="copy-outline" size={20} color="#2563eb" />
                            <Text style={styles.copyButtonText}>Copy Text</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Tips */}
                <View style={styles.tipsCard}>
                    <Text style={styles.tipsTitle}>📷 Tips for Best Results</Text>
                    <Text style={styles.tipItem}>• Good lighting (avoid shadows)</Text>
                    <Text style={styles.tipItem}>• Keep document flat and in focus</Text>
                    <Text style={styles.tipItem}>• Hold camera steady</Text>
                    <Text style={styles.tipItem}>• Printed text works best</Text>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f3f4f6',
    },
    content: {
        padding: 16,
    },
    statusBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        backgroundColor: '#dcfce7',
        borderRadius: 8,
        marginBottom: 16,
        gap: 8,
    },
    statusText: {
        color: '#15803d',
        fontSize: 14,
        fontWeight: '500',
    },
    quickScanButton: {
        backgroundColor: '#2563eb',
        borderRadius: 16,
        padding: 24,
        alignItems: 'center',
        marginBottom: 16,
    },
    quickScanText: {
        color: 'white',
        fontSize: 20,
        fontWeight: 'bold',
        marginTop: 8,
    },
    quickScanSubtext: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 14,
        marginTop: 4,
    },
    divider: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
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
    imageContainer: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        alignItems: 'center',
    },
    previewImage: {
        width: '100%',
        height: 250,
        borderRadius: 8,
        backgroundColor: '#f3f4f6',
    },
    placeholder: {
        width: '100%',
        height: 150,
        backgroundColor: '#f3f4f6',
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#e5e7eb',
        borderStyle: 'dashed',
    },
    placeholderText: {
        marginTop: 8,
        color: '#9ca3af',
    },
    buttonRow: {
        flexDirection: 'row',
        gap: 16,
        marginTop: 16,
        width: '100%',
    },
    actionButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 12,
        backgroundColor: '#f3f4f6',
        borderRadius: 8,
        gap: 8,
    },
    actionButtonText: {
        fontWeight: '600',
        color: '#374151',
    },
    scanButton: {
        backgroundColor: '#10b981',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        borderRadius: 12,
        gap: 8,
        marginBottom: 16,
    },
    buttonDisabled: {
        opacity: 0.6,
    },
    scanButtonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16,
    },
    resultCard: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
    },
    resultHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
    },
    resultTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1f2937',
    },
    statsBadge: {
        backgroundColor: '#dbeafe',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    statsText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#1e40af',
    },
    section: {
        marginBottom: 16,
    },
    sectionLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#6b7280',
        marginBottom: 8,
    },
    confidenceBar: {
        height: 8,
        backgroundColor: '#e5e7eb',
        borderRadius: 4,
        overflow: 'hidden',
    },
    confidenceFill: {
        height: '100%',
        backgroundColor: '#10b981',
        borderRadius: 4,
    },
    confidenceText: {
        fontSize: 12,
        color: '#6b7280',
        marginTop: 4,
    },
    textContainer: {
        maxHeight: 200,
        backgroundColor: '#f9fafb',
        borderRadius: 8,
        padding: 12,
    },
    extractedText: {
        fontSize: 14,
        color: '#1f2937',
        lineHeight: 22,
    },
    copyButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 12,
        backgroundColor: '#dbeafe',
        borderRadius: 8,
        gap: 8,
        marginTop: 8,
    },
    copyButtonText: {
        color: '#2563eb',
        fontWeight: '600',
    },
    tipsCard: {
        backgroundColor: '#fef3c7',
        borderRadius: 12,
        padding: 16,
        marginBottom: 20,
    },
    tipsTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#92400e',
        marginBottom: 8,
    },
    tipItem: {
        fontSize: 14,
        color: '#78350f',
        marginBottom: 4,
    },
});
