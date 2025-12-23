import { useAI } from '@/hooks/useAI';
import { SupportedLanguage } from '@/types/ai.types';
import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function ContentGenerationScreen() {
    const { generate, isLoading, isTextModelReady, isTranslationModelReady } = useAI();

    const [topic, setTopic] = useState('');
    const [subject, setSubject] = useState('');
    const [grade, setGrade] = useState('');
    const [result, setResult] = useState('');
    const [generationTime, setGenerationTime] = useState<number | null>(null);

    const [language, setLanguage] = useState<SupportedLanguage>('english');

    const handleGenerate = async () => {
        // Validation for missing models based on selection
        if (language === 'english' && !isTextModelReady && !isLoading) {
            Alert.alert('Model Missing', 'English model (Gemma) is not initialized. Please go to Dashboard to initialize it.');
            return;
        }

        if (language === 'hindi' && !isTranslationModelReady && !isLoading) {
            Alert.alert('Model Missing', 'Translation model (Sarvam-1) is not initialized. Content will be generated in English. Go to Dashboard to initialize translation model for Hindi output.');
        }

        if (!topic || !subject || !grade) {
            Alert.alert('Missing Info', 'Please fill in all fields.');
            return;
        }

        const startTime = Date.now();
        setResult('');
        setGenerationTime(null);

        try {
            const content = await generate({
                topic,
                subject: subject as any,
                grade: grade as any,
                language: language,
                curriculum: 'cbse',
            });

            const elapsed = Date.now() - startTime;
            setGenerationTime(elapsed);
            setResult(content.content);
        } catch (error) {
            Alert.alert('Error', 'Failed to generate content: ' + (error as Error).message);
        }
    };

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ title: 'Content Generator' }} />

            <View style={styles.form}>
                <Text style={styles.label}>Topic</Text>
                <TextInput
                    style={styles.input}
                    placeholder="e.g. Photosynthesis, Fractions, Independence"
                    value={topic}
                    onChangeText={setTopic}
                    placeholderTextColor="#9ca3af"
                />

                <View style={styles.row}>
                    <View style={styles.col}>
                        <Text style={styles.label}>Subject</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="e.g. Science"
                            value={subject}
                            onChangeText={setSubject}
                            placeholderTextColor="#9ca3af"
                        />
                    </View>
                    <View style={styles.col}>
                        <Text style={styles.label}>Grade</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="e.g. 8"
                            value={grade}
                            onChangeText={setGrade}
                            keyboardType="numeric"
                            placeholderTextColor="#9ca3af"
                        />
                    </View>
                </View>

                {/* Language Selection */}
                <Text style={styles.label}>Language & Model</Text>
                <View style={styles.langRow}>
                    <TouchableOpacity
                        style={[styles.langOption, language === 'english' && styles.langOptionSelected]}
                        onPress={() => setLanguage('english')}
                    >
                        <Text style={[styles.langText, language === 'english' && styles.langTextSelected]}>🇬🇧 English (Gemma)</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.langOption, language === 'hindi' && styles.langOptionSelected]}
                        onPress={() => setLanguage('hindi')}
                    >
                        <Text style={[styles.langText, language === 'hindi' && styles.langTextSelected]}>🇮🇳 Hindi (Sarvam-1)</Text>
                    </TouchableOpacity>
                </View>

                <TouchableOpacity
                    style={[styles.button, isLoading && styles.buttonDisabled]}
                    onPress={handleGenerate}
                    disabled={isLoading}
                >
                    {isLoading ? (
                        <View style={styles.loadingRow}>
                            <ActivityIndicator color="white" size="small" />
                            <Text style={styles.buttonText}>  Generating...</Text>
                        </View>
                    ) : (
                        <Text style={styles.buttonText}>✨ Generate Content</Text>
                    )}
                </TouchableOpacity>
            </View>

            <View style={styles.resultContainer}>
                <View style={styles.resultHeader}>
                    <Text style={styles.resultTitle}>Generated Output</Text>
                    {generationTime !== null && (
                        <View style={styles.timeBadge}>
                            <Ionicons name="time-outline" size={14} color="#059669" />
                            <Text style={styles.timeText}>{(generationTime / 1000).toFixed(1)}s</Text>
                        </View>
                    )}
                </View>
                <ScrollView style={styles.resultBox} contentContainerStyle={styles.resultContent}>
                    {result ? (
                        <Text style={styles.resultText}>{result}</Text>
                    ) : (
                        <View style={styles.placeholderContainer}>
                            <Ionicons name="document-text-outline" size={48} color="#d1d5db" />
                            <Text style={styles.placeholderText}>
                                Generated content will appear here...
                            </Text>
                        </View>
                    )}
                </ScrollView>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f3f4f6',
    },
    form: {
        backgroundColor: 'white',
        padding: 16,
        marginBottom: 8,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 4,
    },
    input: {
        borderWidth: 1,
        borderColor: '#d1d5db',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        marginBottom: 12,
        backgroundColor: '#f9fafb',
    },
    row: {
        flexDirection: 'row',
        gap: 12,
    },
    col: {
        flex: 1,
    },
    button: {
        backgroundColor: '#2563eb',
        padding: 14,
        borderRadius: 10,
        alignItems: 'center',
        marginTop: 4,
    },
    buttonDisabled: {
        backgroundColor: '#93c5fd',
    },
    buttonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16,
    },
    loadingRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    resultContainer: {
        flex: 1,
        padding: 16,
    },
    resultHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    resultTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1f2937',
    },
    timeBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#d1fae5',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        gap: 4,
    },
    timeText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#059669',
    },
    resultBox: {
        flex: 1,
        backgroundColor: 'white',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    resultContent: {
        padding: 16,
        minHeight: 200,
    },
    resultText: {
        fontSize: 16,
        lineHeight: 26,
        color: '#1f2937',
    },
    placeholderContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 40,
    },
    placeholderText: {
        fontSize: 14,
        color: '#9ca3af',
        marginTop: 12,
    },
    langRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 16,
    },
    langOption: {
        flex: 1,
        padding: 12,
        borderRadius: 10,
        backgroundColor: '#f3f4f6',
        borderWidth: 1,
        borderColor: '#e5e7eb',
        alignItems: 'center',
    },
    langOptionSelected: {
        backgroundColor: '#dbeafe',
        borderColor: '#2563eb',
    },
    langText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#4b5563',
    },
    langTextSelected: {
        color: '#2563eb',
    },
});
