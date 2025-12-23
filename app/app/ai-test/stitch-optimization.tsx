/**
 * Stitch Feature Optimization Test
 * 
 * Tests the optimized content generation to ensure:
 * 1. Content follows structured format (Introduction → Bullet Points → Conclusion)
 * 2. No content cutoffs occur
 * 3. Responses complete naturally
 */

import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { useAI } from '../../hooks/useAI';

// Test cases for different grades and subjects
const TEST_CASES = [
    { topic: 'Photosynthesis', subject: 'science', grade: '6' },
    { topic: 'Water Cycle', subject: 'science', grade: '4' },
    { topic: 'Fractions', subject: 'mathematics', grade: '5' },
    { topic: 'Indian Independence', subject: 'history', grade: '8' },
    { topic: 'Solar System', subject: 'science', grade: '7' },
    { topic: 'Quadratic Equations', subject: 'mathematics', grade: '10' },
];

interface TestResult {
    testCase: typeof TEST_CASES[0];
    success: boolean;
    content: string;
    generationTime: number;
    wordCount: number;
    hasIntro: boolean;
    hasConclusion: boolean;
    hasBulletPoints: boolean;
    isCutOff: boolean;
}

export default function StitchOptimizationTest() {
    const { generate, isTextModelReady, isLoading } = useAI();
    const [results, setResults] = useState<TestResult[]>([]);
    const [testing, setTesting] = useState(false);
    const [currentTest, setCurrentTest] = useState<string | null>(null);

    const analyzeContent = (content: string): {
        hasIntro: boolean;
        hasConclusion: boolean;
        hasBulletPoints: boolean;
        isCutOff: boolean;
    } => {
        const hasIntro = content.includes('🎯 INTRODUCTION') ||
            content.includes('INTRODUCTION') ||
            content.toLowerCase().includes('introduction');

        const hasConclusion = content.includes('✅ CONCLUSION') ||
            content.includes('CONCLUSION') ||
            content.toLowerCase().includes('conclusion') ||
            content.toLowerCase().includes('in conclusion') ||
            content.toLowerCase().includes('to summarize');

        const hasBulletPoints = content.includes('•') ||
            content.includes('-') ||
            content.includes('📋');

        // Check if content appears cut off
        const lastChar = content.trim().slice(-1);
        const endsWithPunctuation = ['.', '!', '?', '।'].includes(lastChar);
        const isCutOff = !endsWithPunctuation ||
            (content.length > 100 && !hasConclusion);

        return { hasIntro, hasConclusion, hasBulletPoints, isCutOff };
    };

    const runTests = async () => {
        if (!isTextModelReady) {
            Alert.alert('Model Not Ready', 'Please initialize the text model first.');
            return;
        }

        setTesting(true);
        setResults([]);

        for (const testCase of TEST_CASES) {
            setCurrentTest(`${testCase.topic} (Grade ${testCase.grade})`);

            try {
                const startTime = Date.now();
                const result = await generate({
                    topic: testCase.topic,
                    subject: testCase.subject as any,
                    grade: testCase.grade as any,
                    language: 'english',
                    curriculum: 'cbse',
                });

                const generationTime = Date.now() - startTime;
                const analysis = analyzeContent(result.content);

                const testResult: TestResult = {
                    testCase,
                    success: analysis.hasConclusion && !analysis.isCutOff,
                    content: result.content,
                    generationTime,
                    wordCount: result.wordCount,
                    ...analysis,
                };

                setResults(prev => [...prev, testResult]);

                console.log(`✅ Test: ${testCase.topic}`);
                console.log(`   ├── Time: ${(generationTime / 1000).toFixed(2)}s`);
                console.log(`   ├── Words: ${result.wordCount}`);
                console.log(`   ├── Has Intro: ${analysis.hasIntro}`);
                console.log(`   ├── Has Conclusion: ${analysis.hasConclusion}`);
                console.log(`   ├── Has Bullets: ${analysis.hasBulletPoints}`);
                console.log(`   └── Cut Off: ${analysis.isCutOff}`);

            } catch (error) {
                console.error(`❌ Test failed: ${testCase.topic}`, error);
                setResults(prev => [...prev, {
                    testCase,
                    success: false,
                    content: `Error: ${(error as Error).message}`,
                    generationTime: 0,
                    wordCount: 0,
                    hasIntro: false,
                    hasConclusion: false,
                    hasBulletPoints: false,
                    isCutOff: true,
                }]);
            }
        }

        setTesting(false);
        setCurrentTest(null);
    };

    const successCount = results.filter(r => r.success).length;
    const avgTime = results.length > 0
        ? results.reduce((sum, r) => sum + r.generationTime, 0) / results.length / 1000
        : 0;

    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>🧪 Stitch Optimization Test</Text>
                <Text style={styles.subtitle}>
                    Tests structured content generation
                </Text>
            </View>

            {/* Model Status */}
            <View style={styles.statusCard}>
                <Text style={styles.statusLabel}>Text Model:</Text>
                <Text style={[
                    styles.statusValue,
                    { color: isTextModelReady ? '#10B981' : '#EF4444' }
                ]}>
                    {isTextModelReady ? '✅ Ready' : '❌ Not Ready'}
                </Text>
            </View>

            {/* Run Tests Button */}
            <Pressable
                style={[styles.runButton, testing && styles.runButtonDisabled]}
                onPress={runTests}
                disabled={testing || !isTextModelReady}
            >
                {testing ? (
                    <View style={styles.buttonContent}>
                        <ActivityIndicator color="white" size="small" />
                        <Text style={styles.buttonText}>
                            Testing: {currentTest}
                        </Text>
                    </View>
                ) : (
                    <Text style={styles.buttonText}>
                        🚀 Run All Tests ({TEST_CASES.length})
                    </Text>
                )}
            </Pressable>

            {/* Summary */}
            {results.length > 0 && (
                <View style={styles.summaryCard}>
                    <Text style={styles.summaryTitle}>📊 Test Summary</Text>
                    <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>Success Rate:</Text>
                        <Text style={[
                            styles.summaryValue,
                            { color: successCount === results.length ? '#10B981' : '#F59E0B' }
                        ]}>
                            {successCount}/{results.length} ({Math.round(successCount / results.length * 100)}%)
                        </Text>
                    </View>
                    <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>Avg. Time:</Text>
                        <Text style={styles.summaryValue}>{avgTime.toFixed(2)}s</Text>
                    </View>
                    <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>Content Cutoffs:</Text>
                        <Text style={[
                            styles.summaryValue,
                            { color: results.some(r => r.isCutOff) ? '#EF4444' : '#10B981' }
                        ]}>
                            {results.filter(r => r.isCutOff).length} detected
                        </Text>
                    </View>
                </View>
            )}

            {/* Individual Results */}
            {results.map((result, index) => (
                <View
                    key={index}
                    style={[
                        styles.resultCard,
                        { borderLeftColor: result.success ? '#10B981' : '#EF4444' }
                    ]}
                >
                    <View style={styles.resultHeader}>
                        <Text style={styles.resultTitle}>
                            {result.success ? '✅' : '❌'} {result.testCase.topic}
                        </Text>
                        <Text style={styles.resultMeta}>
                            Grade {result.testCase.grade} • {result.testCase.subject}
                        </Text>
                    </View>

                    <View style={styles.metricsRow}>
                        <View style={[styles.metricBadge, result.hasIntro && styles.metricBadgeGreen]}>
                            <Text style={styles.metricText}>
                                {result.hasIntro ? '✓' : '✗'} Intro
                            </Text>
                        </View>
                        <View style={[styles.metricBadge, result.hasBulletPoints && styles.metricBadgeGreen]}>
                            <Text style={styles.metricText}>
                                {result.hasBulletPoints ? '✓' : '✗'} Bullets
                            </Text>
                        </View>
                        <View style={[styles.metricBadge, result.hasConclusion && styles.metricBadgeGreen]}>
                            <Text style={styles.metricText}>
                                {result.hasConclusion ? '✓' : '✗'} Conclusion
                            </Text>
                        </View>
                        <View style={[styles.metricBadge, !result.isCutOff && styles.metricBadgeGreen]}>
                            <Text style={styles.metricText}>
                                {result.isCutOff ? '✗' : '✓'} Complete
                            </Text>
                        </View>
                    </View>

                    <Text style={styles.resultStats}>
                        ⏱️ {(result.generationTime / 1000).toFixed(2)}s •
                        📝 {result.wordCount} words
                    </Text>

                    <Text style={styles.contentPreview} numberOfLines={5}>
                        {result.content.substring(0, 300)}...
                    </Text>
                </View>
            ))}

            <View style={{ height: 50 }} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F9FAFB',
    },
    header: {
        padding: 20,
        paddingTop: 60,
        backgroundColor: 'white',
    },
    title: {
        fontSize: 24,
        fontWeight: '800',
        color: '#1F2937',
    },
    subtitle: {
        fontSize: 14,
        color: '#6B7280',
        marginTop: 4,
    },
    statusCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'white',
        marginHorizontal: 16,
        marginTop: 16,
        padding: 16,
        borderRadius: 12,
    },
    statusLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
    },
    statusValue: {
        fontSize: 14,
        fontWeight: '600',
        marginLeft: 8,
    },
    runButton: {
        backgroundColor: '#6366F1',
        marginHorizontal: 16,
        marginTop: 16,
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    runButtonDisabled: {
        backgroundColor: '#A5B4FC',
    },
    buttonContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    buttonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
    summaryCard: {
        backgroundColor: 'white',
        marginHorizontal: 16,
        marginTop: 16,
        padding: 16,
        borderRadius: 12,
    },
    summaryTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1F2937',
        marginBottom: 12,
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    summaryLabel: {
        fontSize: 14,
        color: '#6B7280',
    },
    summaryValue: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1F2937',
    },
    resultCard: {
        backgroundColor: 'white',
        marginHorizontal: 16,
        marginTop: 16,
        padding: 16,
        borderRadius: 12,
        borderLeftWidth: 4,
    },
    resultHeader: {
        marginBottom: 12,
    },
    resultTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1F2937',
    },
    resultMeta: {
        fontSize: 12,
        color: '#6B7280',
        marginTop: 2,
    },
    metricsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 12,
    },
    metricBadge: {
        backgroundColor: '#FEE2E2',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    metricBadgeGreen: {
        backgroundColor: '#D1FAE5',
    },
    metricText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#374151',
    },
    resultStats: {
        fontSize: 12,
        color: '#6B7280',
        marginBottom: 8,
    },
    contentPreview: {
        fontSize: 13,
        color: '#4B5563',
        lineHeight: 18,
        backgroundColor: '#F9FAFB',
        padding: 12,
        borderRadius: 8,
    },
});
