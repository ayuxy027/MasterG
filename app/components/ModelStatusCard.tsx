import { useAI } from '@/hooks/useAI';
import React, { useEffect, useMemo, useRef } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export const ModelStatusCard = () => {
    const {
        textModelStatus,
        translationModelStatus,
        visionModelStatus,
        initialize,
        shutdown,
        isLoading,
        error
    } = useAI();

    // Track if auto-initialization has been attempted
    const autoInitAttempted = useRef(false);

    // Auto-initialize models on mount
    useEffect(() => {
        const autoInit = async () => {
            // Only auto-init once and if models aren't already loaded
            if (!autoInitAttempted.current && !textModelStatus.isLoaded && !translationModelStatus.isLoaded && !isLoading) {
                autoInitAttempted.current = true;
                console.log('🚀 Auto-initializing AI models...');
                try {
                    await initialize();
                } catch (err) {
                    console.warn('⚠️ Auto-initialization failed, user can retry manually');
                }
            }
        };

        // Small delay to avoid blocking initial render
        const timer = setTimeout(autoInit, 1000);
        return () => clearTimeout(timer);
    }, []); // Only run on mount

    // Calculate total memory usage (mock/estimated)
    const memoryUsage = useMemo(() => {
        const textMem = textModelStatus.isLoaded ? 1200 : 0;
        const translationMem = translationModelStatus.isLoaded ? 1100 : 0; // Sarvam-1 is ~1.1GB
        return textMem + translationMem;
    }, [textModelStatus.isLoaded, translationModelStatus.isLoaded]);

    const isAnyModelLoaded = textModelStatus.isLoaded || translationModelStatus.isLoaded;

    return (
        <View style={styles.card}>
            <View style={styles.header}>
                <Text style={styles.title}>AI Engine Status</Text>
                {isLoading && <ActivityIndicator size="small" color="#0000ff" />}
            </View>

            {error && (
                <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>{error}</Text>
                </View>
            )}

            <View style={styles.statusRow}>
                <View style={styles.modelRow}>
                    <Text style={styles.label}>Text (Gemma 3)</Text>
                    <View style={[styles.badge, textModelStatus.isLoaded ? styles.badgeSuccess : styles.badgeInactive]}>
                        <Text style={styles.badgeText}>{textModelStatus.isLoaded ? 'Active' : 'Inactive'}</Text>
                    </View>
                </View>
                <View style={styles.modelRow}>
                    <Text style={styles.label}>Translation (Sarvam-1)</Text>
                    <View style={[styles.badge, translationModelStatus.isLoaded ? styles.badgeSuccess : styles.badgeInactive]}>
                        <Text style={styles.badgeText}>{translationModelStatus.isLoaded ? 'Active' : 'Inactive'}</Text>
                    </View>
                </View>
            </View>

            <View style={styles.metricsContainer}>
                <Text style={styles.metricLabel}>Memory Usage (Est.)</Text>
                <Text style={styles.metricValue}>{memoryUsage} MB</Text>
            </View>

            <View style={styles.actions}>
                {isAnyModelLoaded ? (
                    <TouchableOpacity
                        style={[styles.button, styles.buttonDestructive]}
                        onPress={shutdown}
                        disabled={isLoading}
                    >
                        <Text style={styles.buttonText}>Stop AI Engine</Text>
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity
                        style={[styles.button, styles.buttonPrimary]}
                        onPress={initialize}
                        disabled={isLoading}
                    >
                        <Text style={styles.buttonText}>Initialize AI Engine</Text>
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 16,
        margin: 16,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1a1a1a',
    },
    errorContainer: {
        backgroundColor: '#fee2e2',
        padding: 8,
        borderRadius: 8,
        marginBottom: 12,
    },
    errorText: {
        color: '#dc2626',
        fontSize: 14,
    },
    statusRow: {
        flexDirection: 'column',
        gap: 8,
        marginBottom: 16,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    modelRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        width: '100%',
    },
    label: {
        fontSize: 16,
        color: '#374151',
        fontWeight: '500',
    },
    badge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
    },
    badgeSuccess: {
        backgroundColor: '#dcfce7',
    },
    badgeInactive: {
        backgroundColor: '#f3f4f6',
    },
    badgeText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
    },
    metricsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
        backgroundColor: '#f8fafc',
        padding: 12,
        borderRadius: 8,
    },
    metricLabel: {
        fontSize: 14,
        color: '#64748b',
    },
    metricValue: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#0f172a',
    },
    actions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    button: {
        flex: 1,
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    buttonPrimary: {
        backgroundColor: '#2563eb',
    },
    buttonDestructive: {
        backgroundColor: '#dc2626',
    },
    buttonText: {
        color: 'white',
        fontWeight: '600',
        fontSize: 14,
    },
});
