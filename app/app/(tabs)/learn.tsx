import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAI } from '@/hooks/useAI';
import { TranslationResult } from '@/types/ai.types';
import { Feather } from '@expo/vector-icons';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Sarvam-1 supported languages (10 Indian languages)
const TRANSLATION_LANGUAGES = [
    { code: 'hin', name: 'Hindi', native: 'हिंदी' },
    { code: 'ben', name: 'Bengali', native: 'বাংলা' },
    { code: 'tam', name: 'Tamil', native: 'தமிழ்' },
    { code: 'tel', name: 'Telugu', native: 'తెలుగు' },
    { code: 'kan', name: 'Kannada', native: 'ಕನ್ನಡ' },
    { code: 'mal', name: 'Malayalam', native: 'മലയാളം' },
    { code: 'mar', name: 'Marathi', native: 'मराठी' },
    { code: 'guj', name: 'Gujarati', native: 'ગુજરાતી' },
    { code: 'pan', name: 'Punjabi', native: 'ਪੰਜਾਬੀ' },
    { code: 'ori', name: 'Odia', native: 'ଓଡ଼ିଆ' },
    { code: 'asm', name: 'Assamese', native: 'অসমীয়া' },
    { code: 'urd', name: 'Urdu', native: 'اردو' },
    { code: 'nep', name: 'Nepali', native: 'नेपाली' },
    { code: 'san', name: 'Sanskrit', native: 'संस्कृतम्' },
    { code: 'kok', name: 'Konkani', native: 'कोंकणी' },
    { code: 'mai', name: 'Maithili', native: 'मैथिली' },
    { code: 'brx', name: 'Bodo', native: 'बड़ो' },
    { code: 'doi', name: 'Dogri', native: 'डोगरी' },
    { code: 'kas', name: 'Kashmiri', native: 'कॉशुर' },
    { code: 'mni', name: 'Manipuri', native: 'মৈতৈলোন্' },
    { code: 'sat', name: 'Santali', native: 'ᱥᱟᱱᱛᱟᱲᱤ' },
    { code: 'snd', name: 'Sindhi', native: 'سنڌي' },
];

export default function LearnScreen() {
    const insets = useSafeAreaInsets();
    const {
        generate,
        isLoading,
        isTextModelReady,
        translate,
        isTranslationModelReady,
        initializeTranslation
    } = useAI();

    const [topic, setTopic] = useState('');
    const [subject, setSubject] = useState('');
    const [grade, setGrade] = useState('');
    const [additionalPrompt, setAdditionalPrompt] = useState('');

    // Generated content state
    const [originalContent, setOriginalContent] = useState(''); // Always English
    const [displayContent, setDisplayContent] = useState('');
    const [isTranslated, setIsTranslated] = useState(false);
    const [translatedLanguage, setTranslatedLanguage] = useState<string | null>(null);

    // UI state
    const [showLanguagePicker, setShowLanguagePicker] = useState(false);
    const [translating, setTranslating] = useState(false);
    const [initializingTranslation, setInitializingTranslation] = useState(false);

    // Response time tracking (in seconds)
    const [generationTime, setGenerationTime] = useState<number | null>(null);
    const [translationTime, setTranslationTime] = useState<number | null>(null);
    const [translationMethod, setTranslationMethod] = useState<string | null>(null);
    const [translationStats, setTranslationStats] = useState<{ inputChars: number; outputChars: number } | null>(null);

    // Generate content in ENGLISH (high quality) using Gemma
    const handleGenerate = async () => {
        if (!isTextModelReady) {
            Alert.alert('Model Not Ready', 'Gemma Model is not initialized. Please check Home tab.');
            return;
        }

        if (!topic || !subject || !grade) return;

        // Start timing
        const startTime = Date.now();
        setGenerationTime(null);
        setTranslationTime(null);
        setTranslationMethod(null);
        setTranslationStats(null);

        try {
            const finalTopic = additionalPrompt
                ? `${topic}. Instructions: ${additionalPrompt}`
                : topic;

            // ALWAYS generate in English for best quality
            const content = await generate({
                topic: finalTopic,
                subject: subject as any,
                grade: grade as any,
                language: 'english', // Always English first
                curriculum: 'cbse',
            });

            // Calculate generation time in seconds
            const elapsedSecs = (Date.now() - startTime) / 1000;
            setGenerationTime(elapsedSecs);

            console.log(`⏱️ [STITCH] Content generation completed in ${elapsedSecs.toFixed(2)}s`);

            setOriginalContent(content.content);
            setDisplayContent(content.content);
            setIsTranslated(false);
            setTranslatedLanguage(null);
        } catch (error) {
            Alert.alert('Error', 'Failed to generate content: ' + (error as Error).message);
        }
    };

    // Handle translation using Sarvam-1
    const handleTranslate = useCallback(async (targetLanguage: string) => {
        if (!originalContent) return;

        // Check if translation model is ready
        if (!isTranslationModelReady) {
            Alert.alert(
                'Translation Model Required',
                'The Sarvam-1 translation model needs to be initialized. Would you like to initialize it now?',
                [
                    { text: 'Cancel', style: 'cancel' },
                    {
                        text: 'Initialize',
                        onPress: async () => {
                            try {
                                setInitializingTranslation(true);
                                await initializeTranslation();
                                Alert.alert('Success', 'Translation model is now ready! Try translating again.');
                            } catch (error) {
                                Alert.alert('Error', 'Failed to initialize: ' + (error as Error).message);
                            } finally {
                                setInitializingTranslation(false);
                            }
                        }
                    }
                ]
            );
            setShowLanguagePicker(false);
            return;
        }

        setTranslating(true);
        setShowLanguagePicker(false);

        // Start timing
        const startTime = Date.now();

        try {
            const langInfo = TRANSLATION_LANGUAGES.find(l => l.code === targetLanguage);

            const result: TranslationResult = await translate({
                text: originalContent,
                sourceLanguage: 'english',
                targetLanguage: targetLanguage,
                context: 'educational'
            });

            // Calculate translation time in seconds
            const elapsedSecs = (Date.now() - startTime) / 1000;
            setTranslationTime(elapsedSecs);

            // Store translation method and stats
            setTranslationMethod(result.method);
            setTranslationStats({
                inputChars: originalContent.length,
                outputChars: result.translatedText.length
            });

            setDisplayContent(result.translatedText);
            setIsTranslated(true);
            setTranslatedLanguage(langInfo?.native || targetLanguage);

            console.log(`⏱️ [STITCH] Translation completed in ${elapsedSecs.toFixed(2)}s`);
            console.log('✅ Translation details:', {
                confidence: result.confidence,
                method: result.method,
                processingTime: `${(result.processingTime / 1000).toFixed(2)}s`,
                inputChars: originalContent.length,
                outputChars: result.translatedText.length,
                expansion: `${(result.translatedText.length / originalContent.length * 100).toFixed(0)}%`
            });


        } catch (error) {
            Alert.alert('Translation Error', 'Failed to translate: ' + (error as Error).message);
        } finally {
            setTranslating(false);
        }
    }, [originalContent, isTranslationModelReady, translate, initializeTranslation]);

    // Revert to original English content
    const handleShowOriginal = useCallback(() => {
        setDisplayContent(originalContent);
        setIsTranslated(false);
        setTranslatedLanguage(null);
    }, [originalContent]);

    return (
        <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <ThemedView style={styles.header}>
                    <ThemedText type="title" style={styles.headerTitle}>Stitch</ThemedText>
                    <ThemedText style={styles.headerSubtitle}>
                        Generate in English → Translate to 10 Languages
                    </ThemedText>
                </ThemedView>

                <ThemedView style={styles.formCard}>
                    <ThemedText type="defaultSemiBold" style={styles.label}>Topic</ThemedText>
                    <TextInput
                        style={styles.input}
                        placeholder="e.g. Photosynthesis, Fractions"
                        placeholderTextColor="#9CA3AF"
                        value={topic}
                        onChangeText={setTopic}
                    />

                    <ThemedText type="defaultSemiBold" style={styles.label}>Subject</ThemedText>
                    <TextInput
                        style={styles.input}
                        placeholder="e.g. Science, Mathematics"
                        placeholderTextColor="#9CA3AF"
                        value={subject}
                        onChangeText={setSubject}
                    />

                    <ThemedText type="defaultSemiBold" style={styles.label}>Grade Level</ThemedText>
                    <TextInput
                        style={styles.input}
                        placeholder="e.g. 5, 8, 10"
                        placeholderTextColor="#9CA3AF"
                        value={grade}
                        onChangeText={setGrade}
                        keyboardType="numeric"
                    />

                    <ThemedText type="defaultSemiBold" style={styles.label}>Additional Instructions (Optional)</ThemedText>
                    <TextInput
                        style={[styles.input, styles.textArea]}
                        placeholder="e.g. Include a quiz, use simple words..."
                        placeholderTextColor="#9CA3AF"
                        value={additionalPrompt}
                        onChangeText={setAdditionalPrompt}
                        multiline
                        textAlignVertical="top"
                    />

                    <Pressable
                        style={({ pressed }) => [
                            styles.button,
                            pressed && styles.buttonPressed,
                            (!topic || !subject || !grade || isLoading) && styles.buttonDisabled
                        ]}
                        onPress={handleGenerate}
                        disabled={!topic || !subject || !grade || isLoading}
                    >
                        {isLoading ? (
                            <ActivityIndicator color="white" size="small" />
                        ) : (
                            <Feather name="cpu" size={20} color="white" />
                        )}
                        <ThemedText style={styles.buttonText}>
                            {isLoading ? 'Generating...' : 'Generate in English'}
                        </ThemedText>
                    </Pressable>

                    {/* Model status hint */}
                    <View style={styles.statusHint}>
                        <Feather
                            name={isTextModelReady ? "check-circle" : "alert-circle"}
                            size={14}
                            color={isTextModelReady ? "#10B981" : "#F59E0B"}
                        />
                        <ThemedText style={styles.statusHintText}>
                            Gemma: {isTextModelReady ? 'Ready' : 'Not initialized'}
                        </ThemedText>
                        <View style={styles.statusDot} />
                        <Feather
                            name={isTranslationModelReady ? "check-circle" : "alert-circle"}
                            size={14}
                            color={isTranslationModelReady ? "#10B981" : "#6B7280"}
                        />
                        <ThemedText style={styles.statusHintText}>
                            Sarvam-1: {isTranslationModelReady ? 'Ready' : 'Not loaded'}
                        </ThemedText>
                    </View>
                </ThemedView>

                {/* Generated Content Result */}
                {displayContent ? (
                    <ThemedView style={styles.resultCard}>
                        <View style={styles.resultHeader}>
                            <View style={{ flex: 1 }}>
                                <ThemedText type="subtitle" style={styles.resultTitle}>{topic}</ThemedText>
                                <ThemedText style={styles.resultMeta}>
                                    {subject} • Grade {grade}
                                </ThemedText>
                                {/* Response time badges */}
                                <View style={styles.timingRow}>
                                    {generationTime !== null && (
                                        <View style={styles.timingBadge}>
                                            <Feather name="zap" size={10} color="#10B981" />
                                            <ThemedText style={styles.timingText}>
                                                Gen: {generationTime.toFixed(1)}s
                                            </ThemedText>
                                        </View>
                                    )}
                                    {translationTime !== null && (
                                        <View style={[styles.timingBadge, { backgroundColor: '#FEF3C7' }]}>
                                            <Feather name="globe" size={10} color="#F59E0B" />
                                            <ThemedText style={[styles.timingText, { color: '#B45309' }]}>
                                                Trans: {translationTime.toFixed(1)}s
                                                {translationMethod?.includes('Chunked') ? ' (📦)' : ''}
                                            </ThemedText>
                                        </View>
                                    )}
                                    {translationStats && (
                                        <View style={[styles.timingBadge, { backgroundColor: '#E0E7FF' }]}>
                                            <Feather name="maximize-2" size={10} color="#4F46E5" />
                                            <ThemedText style={[styles.timingText, { color: '#4338CA' }]}>
                                                {Math.round(translationStats.outputChars / translationStats.inputChars * 100)}%
                                            </ThemedText>
                                        </View>
                                    )}
                                </View>
                            </View>
                            {isTranslated && translatedLanguage && (
                                <View style={styles.langBadge}>
                                    <Feather name="globe" size={12} color="#10B981" />
                                    <ThemedText style={styles.langBadgeText}>{translatedLanguage}</ThemedText>
                                </View>
                            )}
                        </View>

                        <ThemedText style={styles.resultBody}>{displayContent}</ThemedText>

                        {/* Translation Actions */}
                        <View style={styles.resultActions}>
                            <Pressable
                                style={({ pressed }) => [
                                    styles.translateBtn,
                                    pressed && { opacity: 0.8 },
                                    translating && styles.translateBtnActive
                                ]}
                                onPress={() => setShowLanguagePicker(true)}
                                disabled={translating}
                            >
                                {translating ? (
                                    <ActivityIndicator color="#F97316" size="small" />
                                ) : (
                                    <Feather name="globe" size={18} color="#F97316" />
                                )}
                                <ThemedText style={styles.translateBtnText}>
                                    {translating ? 'Translating...' : (isTranslated ? 'Translate Again' : 'Translate')}
                                </ThemedText>
                            </Pressable>

                            {isTranslated && (
                                <Pressable
                                    style={({ pressed }) => [styles.originalBtn, pressed && { opacity: 0.8 }]}
                                    onPress={handleShowOriginal}
                                >
                                    <Feather name="rotate-ccw" size={16} color="#6B7280" />
                                    <ThemedText style={styles.originalBtnText}>Show Original</ThemedText>
                                </Pressable>
                            )}
                        </View>
                    </ThemedView>
                ) : (
                    <ThemedView style={styles.placeholderContainer}>
                        <Feather name="book-open" size={48} color="#E5E7EB" />
                        <ThemedText style={styles.placeholderText}>
                            {!isTextModelReady ? 'Initialize Gemma model from Home tab' : 'Generated content will appear here'}
                        </ThemedText>
                    </ThemedView>
                )}
            </ScrollView>

            {/* Translation Language Picker Modal */}
            <Modal
                visible={showLanguagePicker}
                transparent
                animationType="slide"
                onRequestClose={() => setShowLanguagePicker(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <View>
                                <ThemedText type="subtitle" style={styles.modalTitle}>
                                    🌐 Translate to Indian Language
                                </ThemedText>
                                <ThemedText style={styles.modalSubtitle}>
                                    Powered by Sarvam-1 • 10 Languages
                                </ThemedText>
                            </View>
                            <TouchableOpacity onPress={() => setShowLanguagePicker(false)}>
                                <Feather name="x" size={24} color="#6B7280" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.modalList}>
                            {TRANSLATION_LANGUAGES.map((lang) => (
                                <TouchableOpacity
                                    key={lang.code}
                                    style={styles.langOption}
                                    onPress={() => handleTranslate(lang.code)}
                                    disabled={translating}
                                >
                                    <View style={styles.langOptionContent}>
                                        <ThemedText style={styles.langNative}>{lang.native}</ThemedText>
                                        <ThemedText style={styles.langLabel}>{lang.name}</ThemedText>
                                    </View>
                                    <Feather name="chevron-right" size={20} color="#9CA3AF" />
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* Initializing Translation Overlay */}
            {initializingTranslation && (
                <View style={styles.initOverlay}>
                    <View style={styles.initCard}>
                        <ActivityIndicator color="#F97316" size="large" />
                        <ThemedText style={styles.initText}>
                            Initializing Sarvam-1...
                        </ThemedText>
                        <ThemedText style={styles.initSubText}>
                            First-time setup may take a moment
                        </ThemedText>
                    </View>
                </View>
            )}
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollContent: {
        padding: 20,
        paddingBottom: 140,
    },
    header: {
        marginBottom: 24,
        backgroundColor: 'transparent',
    },
    headerTitle: {
        fontSize: 32,
        fontWeight: '800',
        letterSpacing: -1,
        marginBottom: 4,
    },
    headerSubtitle: {
        fontSize: 14,
        color: '#6B7280',
    },
    formCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 4,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.03)',
    },
    label: {
        marginBottom: 8,
        color: '#374151',
    },
    input: {
        backgroundColor: '#F3F4F6',
        borderRadius: 14,
        padding: 16,
        marginBottom: 16,
        fontSize: 16,
        color: '#1F2937',
    },
    textArea: {
        minHeight: 100,
        textAlignVertical: 'top',
    },
    button: {
        backgroundColor: '#F97316',
        borderRadius: 16,
        paddingVertical: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        shadowColor: '#F97316',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
        marginTop: 8,
    },
    buttonPressed: {
        opacity: 0.9,
        transform: [{ scale: 0.98 }],
    },
    buttonDisabled: {
        backgroundColor: '#D1D5DB',
        shadowOpacity: 0,
    },
    buttonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '700',
    },
    statusHint: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 16,
        gap: 6,
    },
    statusHintText: {
        fontSize: 12,
        color: '#6B7280',
    },
    statusDot: {
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: '#D1D5DB',
        marginHorizontal: 4,
    },
    resultCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        padding: 20,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    resultHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 16,
    },
    resultTitle: {
        color: '#1F2937',
        fontSize: 20,
        fontWeight: '700',
    },
    resultMeta: {
        fontSize: 13,
        color: '#6B7280',
        marginTop: 4,
    },
    langBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#ECFDF5',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 100,
        borderWidth: 1,
        borderColor: '#A7F3D0',
    },
    langBadgeText: {
        fontSize: 12,
        color: '#059669',
        fontWeight: '600',
    },
    resultBody: {
        lineHeight: 26,
        color: '#4B5563',
        fontSize: 16,
        marginBottom: 20,
    },
    resultActions: {
        flexDirection: 'row',
        gap: 12,
        borderTopWidth: 1,
        borderTopColor: '#F3F4F6',
        paddingTop: 16,
    },
    translateBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: '#FFF7ED',
        paddingVertical: 14,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#FDBA74',
    },
    translateBtnActive: {
        backgroundColor: '#FEF3C7',
    },
    translateBtnText: {
        color: '#EA580C',
        fontWeight: '600',
        fontSize: 15,
    },
    originalBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        backgroundColor: '#F3F4F6',
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 14,
    },
    originalBtnText: {
        color: '#6B7280',
        fontWeight: '600',
        fontSize: 13,
    },
    placeholderContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40,
        backgroundColor: 'transparent',
    },
    placeholderText: {
        marginTop: 16,
        color: '#9CA3AF',
        fontSize: 14,
        textAlign: 'center',
    },
    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: '75%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    modalTitle: {
        color: '#1F2937',
        fontSize: 18,
    },
    modalSubtitle: {
        fontSize: 13,
        color: '#6B7280',
        marginTop: 4,
    },
    modalList: {
        padding: 12,
    },
    langOption: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 14,
        marginBottom: 8,
        backgroundColor: '#F9FAFB',
    },
    langOptionContent: {
        flex: 1,
    },
    langNative: {
        fontSize: 20,
        fontWeight: '600',
        color: '#1F2937',
    },
    langLabel: {
        fontSize: 13,
        color: '#6B7280',
        marginTop: 2,
    },
    // Initialization Overlay
    initOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 100,
    },
    initCard: {
        backgroundColor: 'white',
        borderRadius: 24,
        padding: 32,
        alignItems: 'center',
        gap: 16,
        marginHorizontal: 40,
    },
    initText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1F2937',
        textAlign: 'center',
    },
    initSubText: {
        fontSize: 13,
        color: '#6B7280',
        textAlign: 'center',
    },
    // Timing badges for response times
    timingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 6,
    },
    timingBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#D1FAE5',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 12,
        gap: 4,
    },
    timingText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#059669',
    },
});
