import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import CameraOCRService from '@/services/ai/CameraOCRService';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, View, useColorScheme } from 'react-native';
import Animated, { FadeIn, FadeInDown, Layout, SlideInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface OCRScanResult {
    text: string;
    blockCount: number;
    wordCount: number;
    confidence: number;
}

export default function ScanScreen() {
    const insets = useSafeAreaInsets();
    const ocrService = CameraOCRService.getInstance();
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';

    const [imageUri, setImageUri] = useState<string | null>(null);
    const [result, setResult] = useState<OCRScanResult | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const pickImage = async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: false,
                quality: 1,
            });

            if (!result.canceled) {
                setImageUri(result.assets[0].uri);
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
                setImageUri(pickerResult.assets[0].uri);
                setResult(null);
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to take photo');
        }
    };

    // Use ML Kit OCR instead of Vision Model
    const handleScan = async () => {
        if (!imageUri) return;

        setIsLoading(true);
        try {
            const ocrResult = await ocrService.extractTextFromImage(imageUri);

            if (ocrResult.text.length < 5) {
                Alert.alert(
                    'No Text Found',
                    'Could not find readable text in this image.\n\nTips:\n• Use good lighting\n• Hold camera steady\n• Make sure text is in focus'
                );
                setIsLoading(false);
                return;
            }

            setResult(ocrResult);
        } catch (error) {
            Alert.alert('Error', 'Text extraction failed: ' + (error as Error).message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleReset = () => {
        setImageUri(null);
        setResult(null);
    }

    return (
        <ThemedView style={[styles.container]}>
            <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
                <View>
                    <ThemedText type="title" style={styles.headerTitle}>Smart Scan</ThemedText>
                    <ThemedText style={styles.headerSubtitle}>Digitize Documents Instantly</ThemedText>
                </View>
                <View style={styles.headerIcon}>
                    <Feather name="maximize" size={24} color="#F97316" />
                </View>
            </View>

            <View style={styles.content}>
                {!imageUri ? (
                    <Animated.View entering={FadeIn.delay(200)} style={styles.placeholderContainer}>
                        <View style={styles.placeholderCard}>
                            <View style={styles.illustrationCircle}>
                                <Feather name="camera" size={48} color="rgba(249, 115, 22, 0.8)" />
                            </View>
                            <ThemedText type="subtitle" style={styles.placeholderTitle}>Ready to Scan</ThemedText>
                            <ThemedText style={styles.placeholderText}>
                                Capture documents, notes, or book pages to extract text instantly.
                            </ThemedText>
                        </View>

                        <View style={styles.actionRow}>
                            <Pressable
                                style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}
                                onPress={takePhoto}
                            >
                                <Feather name="camera" size={24} color="white" />
                                <ThemedText style={styles.primaryBtnText}>Camera</ThemedText>
                            </Pressable>

                            <Pressable
                                style={({ pressed }) => [styles.secondaryBtn, pressed && styles.pressed]}
                                onPress={pickImage}
                            >
                                <Feather name="image" size={24} color="#F97316" />
                                <ThemedText style={styles.secondaryBtnText}>Gallery</ThemedText>
                            </Pressable>
                        </View>
                    </Animated.View>
                ) : (
                    <View style={styles.resultContainer}>
                        <Animated.View
                            entering={FadeInDown}
                            style={styles.imagePreviewContainer}
                            layout={Layout.springify()}
                        >
                            <Image source={{ uri: imageUri }} style={styles.previewImage} resizeMode="contain" />

                            {!result && (
                                <View style={styles.overlayControls}>
                                    <Pressable onPress={handleReset} style={styles.closePreviewBtn}>
                                        <Feather name="x" size={24} color="white" />
                                    </Pressable>
                                </View>
                            )}
                        </Animated.View>

                        {!result ? (
                            <Animated.View entering={FadeInDown.delay(100)} style={styles.controlsContainer}>
                                <Pressable
                                    style={({ pressed }) => [styles.analyzeButton, isLoading && styles.disabledButton, pressed && styles.pressed]}
                                    onPress={handleScan}
                                    disabled={isLoading}
                                >
                                    {isLoading ? (
                                        <>
                                            <ActivityIndicator color="white" />
                                            <ThemedText style={styles.analyzeButtonText}>Processing...</ThemedText>
                                        </>
                                    ) : (
                                        <>
                                            <Feather name="cpu" size={20} color="white" />
                                            <ThemedText style={styles.analyzeButtonText}>Extract Text</ThemedText>
                                        </>
                                    )}
                                </Pressable>
                                <ThemedText style={styles.hintText}>Powered by On-Device ML</ThemedText>
                            </Animated.View>
                        ) : (
                            <Animated.View
                                entering={SlideInDown.springify().damping(15)}
                                style={[styles.resultSheet, isDark ? styles.resultSheetDark : styles.resultSheetLight]}
                            >
                                <View style={styles.dragHandle} />

                                <View style={styles.resultHeader}>
                                    <View>
                                        <ThemedText type="subtitle" style={styles.resultTitle}>Extracted Content</ThemedText>
                                        <ThemedText style={styles.resultMeta}>
                                            {result.wordCount} words • {Math.round(result.confidence * 100)}% Match
                                        </ThemedText>
                                    </View>
                                    <Pressable onPress={handleReset} style={styles.iconBtn}>
                                        <Feather name="refresh-ccw" size={20} color="#F97316" />
                                    </Pressable>
                                </View>

                                <ScrollView style={styles.textScroll} showsVerticalScrollIndicator={false}>
                                    <ThemedText style={styles.extractedText}>{result.text}</ThemedText>
                                </ScrollView>

                                <View style={styles.sheetActions}>
                                    <Pressable style={[styles.actionChip, { backgroundColor: '#F3F4F6' }]}>
                                        <Feather name="copy" size={16} color="#374151" />
                                        <ThemedText style={{ fontSize: 12, color: '#374151', fontWeight: '600' }}>Copy</ThemedText>
                                    </Pressable>
                                    <Pressable style={[styles.actionChip, { backgroundColor: '#F3F4F6' }]}>
                                        <Feather name="share" size={16} color="#374151" />
                                        <ThemedText style={{ fontSize: 12, color: '#374151', fontWeight: '600' }}>Share</ThemedText>
                                    </Pressable>
                                </View>
                            </Animated.View>
                        )}
                    </View>
                )}
            </View>
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        paddingHorizontal: 24,
        paddingBottom: 24,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 34,
        fontWeight: '800',
        letterSpacing: -1,
    },
    headerSubtitle: {
        fontSize: 16,
        color: '#6B7280',
        marginTop: 4,
    },
    headerIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: 'rgba(249, 115, 22, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    content: {
        flex: 1,
    },
    placeholderContainer: {
        flex: 1,
        padding: 24,
        justifyContent: 'center',
        gap: 32,
    },
    placeholderCard: {
        alignItems: 'center',
        padding: 32,
    },
    illustrationCircle: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: 'rgba(249, 115, 22, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
        borderWidth: 1,
        borderColor: 'rgba(249, 115, 22, 0.2)',
    },
    placeholderTitle: {
        fontSize: 24,
        fontWeight: '700',
        marginBottom: 12,
        textAlign: 'center',
    },
    placeholderText: {
        textAlign: 'center',
        color: '#6B7280',
        lineHeight: 24,
        maxWidth: 280,
    },
    actionRow: {
        flexDirection: 'row',
        gap: 16,
    },
    primaryBtn: {
        flex: 2,
        backgroundColor: '#F97316',
        height: 64,
        borderRadius: 20,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        shadowColor: '#F97316',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
        elevation: 8,
    },
    secondaryBtn: {
        flex: 1,
        backgroundColor: 'rgba(255,255,255,0.8)', // Glass-like
        height: 64,
        borderRadius: 20,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    primaryBtnText: {
        color: 'white',
        fontSize: 18,
        fontWeight: '700',
    },
    secondaryBtnText: {
        color: '#F97316',
        fontSize: 16,
        fontWeight: '600',
    },
    resultContainer: {
        flex: 1,
        backgroundColor: '#000', // Captive background
    },
    imagePreviewContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#000',
    },
    previewImage: {
        width: '100%',
        height: '100%',
        opacity: 0.9,
    },
    overlayControls: {
        position: 'absolute',
        top: 20,
        right: 20,
        zIndex: 10,
    },
    closePreviewBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(0,0,0,0.5)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    controlsContainer: {
        position: 'absolute',
        bottom: 50,
        left: 24,
        right: 24,
        gap: 16,
        alignItems: 'center',
    },
    analyzeButton: {
        width: '100%',
        backgroundColor: '#10B981',
        height: 64,
        borderRadius: 20,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        shadowColor: '#10B981',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
        elevation: 8,
    },
    analyzeButtonText: {
        color: 'white',
        fontSize: 18,
        fontWeight: '700',
    },
    hintText: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 12,
    },
    resultSheet: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: '65%', // Takes up 65% of screen
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        padding: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 10,
    },
    resultSheetLight: {
        backgroundColor: 'white',
    },
    resultSheetDark: {
        backgroundColor: '#1F2937',
    },
    dragHandle: {
        width: 40,
        height: 4,
        backgroundColor: 'rgba(150,150,150,0.3)',
        borderRadius: 2,
        alignSelf: 'center',
        marginBottom: 20,
    },
    resultHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 16,
    },
    resultTitle: {
        fontSize: 20,
        fontWeight: '700',
        marginBottom: 4,
    },
    resultMeta: {
        fontSize: 13,
        color: '#6B7280',
        fontWeight: '500',
    },
    iconBtn: {
        padding: 8,
        backgroundColor: 'rgba(249, 115, 22, 0.1)',
        borderRadius: 12,
    },
    textScroll: {
        flex: 1,
        backgroundColor: 'rgba(150,150,150,0.05)',
        borderRadius: 16,
        padding: 16,
        marginBottom: 20,
    },
    extractedText: {
        fontSize: 16,
        lineHeight: 24,
        color: '#374151',
    },
    sheetActions: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 20,
    },
    actionChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 100,
    },
    disabledButton: {
        backgroundColor: '#6B7280',
        shadowOpacity: 0,
    },
    pressed: {
        opacity: 0.9,
        transform: [{ scale: 0.99 }]
    }
});
