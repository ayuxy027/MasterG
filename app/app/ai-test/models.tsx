import ModelDownloader from '@/services/ai/ModelDownloader';
import { TEXT_MODEL_CONFIG, TRANSLATION_MODEL_CONFIG } from '@/services/ai/constants';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Linking from 'expo-linking';
import { Stack } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// Direct download URL
const MODEL_URL = 'https://huggingface.co/google/gemma-3-1b-it-qat-q4_0-gguf/resolve/main/gemma-3-1b-it-q4_0.gguf';

export default function ModelManagerScreen() {
    const [downloader] = useState(() => ModelDownloader.getInstance());
    const [modelStatus, setModelStatus] = useState({ text: false, translation: false });
    const [downloading, setDownloading] = useState({ text: false, translation: false });
    const [progress, setProgress] = useState({ text: 0, translation: 0 });
    const [isImporting, setIsImporting] = useState(false);
    const [isChecking, setIsChecking] = useState(true);

    const checkStatus = useCallback(async () => {
        try {
            const status = await downloader.checkDownloadedModels();
            setModelStatus(status);
        } catch (error) {
            console.error('Error checking model status:', error);
        } finally {
            setIsChecking(false);
        }
    }, [downloader]);

    useEffect(() => {
        checkStatus();
    }, [checkStatus]);

    const handleDownload = async (type: 'text' | 'translation') => {
        setDownloading(prev => ({ ...prev, [type]: true }));
        setProgress(prev => ({ ...prev, [type]: 0 }));

        try {
            let result;
            if (type === 'text') {
                result = await downloader.downloadTextModel((p) => {
                    setProgress(prev => ({ ...prev, text: p.percentage }));
                });
            } else {
                result = await downloader.downloadTranslationModel((p) => {
                    setProgress(prev => ({ ...prev, translation: p.percentage }));
                });
            }

            if (result.success) {
                Alert.alert('✅ Success', `${type === 'text' ? 'Text' : 'Translation'} model downloaded successfully!`);
            } else {
                Alert.alert('❌ Download Failed', result.error || 'Unknown error');
            }
        } catch (error) {
            Alert.alert('Error', (error as Error).message);
        } finally {
            setDownloading(prev => ({ ...prev, [type]: false }));
            checkStatus();
        }
    };

    const handleDelete = async (type: 'text' | 'translation') => {
        Alert.alert(
            'Delete Model',
            `Are you sure you want to delete the ${type} model?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        await downloader.deleteModel(type);
                        checkStatus();
                    },
                },
            ]
        );
    };

    const handleOpenUrl = (url: string) => {
        Linking.openURL(url);
    };

    const handleImportFromDownloads = async () => {
        setIsImporting(true);
        console.log('🔍 Starting import from Downloads...');

        const downloadPaths = [
            'file:///storage/emulated/0/Download/',
            'file:///sdcard/Download/',
            '/storage/emulated/0/Download/',
            '/sdcard/Download/',
        ];

        const modelFiles = [
            { name: 'gemma-3-1b-it-q4_0.gguf', key: 'text', limit: 900000000 },
            { name: 'sarvam-1-Q4_K_M.gguf', key: 'translation', limit: 1000000000 },
        ];

        const modelsDir = `${FileSystem.documentDirectory}models/`;
        let importedCount = 0;

        try {
            const dirInfo = await FileSystem.getInfoAsync(modelsDir);
            if (!dirInfo.exists) {
                await FileSystem.makeDirectoryAsync(modelsDir, { intermediates: true });
                console.log('📁 Created models directory');
            }

            for (const model of modelFiles) {
                let found = false;
                for (const basePath of downloadPaths) {
                    if (found) break;

                    const sourcePath = basePath.startsWith('file://')
                        ? `${basePath}${model.name}`
                        : `file://${basePath}${model.name}`;
                    const targetPath = `${modelsDir}${model.name}`;

                    try {
                        console.log(`   Checking: ${sourcePath}`);
                        const fileInfo = await FileSystem.getInfoAsync(sourcePath);

                        if (fileInfo.exists && (fileInfo as any).size && (fileInfo as any).size > model.limit) {
                            console.log(`✅ Found ${model.key} model`);
                            const existing = await FileSystem.getInfoAsync(targetPath);
                            if (existing.exists) await FileSystem.deleteAsync(targetPath);

                            await FileSystem.copyAsync({ from: sourcePath, to: targetPath });
                            console.log(`✅ Imported ${model.key}`);
                            found = true;
                            importedCount++;
                        }
                    } catch (e) { }
                }
            }

            await checkStatus();

            if (importedCount > 0) {
                Alert.alert('✅ Import Complete', `Imported ${importedCount} model(s) successfully!`);
            } else {
                Alert.alert(
                    '❌ No Models Found',
                    'Make sure .gguf files are in Download folder.'
                );
            }
        } catch (error) {
            console.error('❌ Import error:', error);
            Alert.alert('Error', 'Import failed: ' + (error as Error).message);
        } finally {
            setIsImporting(false);
        }
    };

    const handlePickFile = async (type: 'text' | 'translation') => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: '*/*',
                copyToCacheDirectory: false,
            });

            if (result.canceled || !result.assets || result.assets.length === 0) return;

            const file = result.assets[0];
            if (!file.name.endsWith('.gguf')) {
                Alert.alert('Invalid File', 'Please select a .gguf model file.');
                return;
            }

            const modelsDir = `${FileSystem.documentDirectory}models/`;
            const targetName = type === 'text'
                ? 'gemma-3-1b-it-q4_0.gguf'
                : 'sarvam-1-Q4_K_M.gguf';

            const targetPath = `${modelsDir}${targetName}`;
            const limit = type === 'text' ? 900000000 : 1000000000;

            const dirInfo = await FileSystem.getInfoAsync(modelsDir);
            if (!dirInfo.exists) await FileSystem.makeDirectoryAsync(modelsDir, { intermediates: true });

            console.log(`📋 Copying to: ${targetPath}`);
            await FileSystem.copyAsync({ from: file.uri, to: targetPath });

            const copied = await FileSystem.getInfoAsync(targetPath);
            if (copied.exists && (copied as any).size && (copied as any).size > limit) {
                Alert.alert('✅ Success', `${type} model imported successfully!`);
                await checkStatus();
            } else {
                Alert.alert('❌ Error', 'File copy failed or file is too small.');
            }
        } catch (error) {
            console.error('Pick file error:', error);
            Alert.alert('Error', `Failed to import: ${error}`);
        }
    };

    const renderModelCard = (
        type: 'text' | 'translation',
        title: string,
        size: number,
        desc: string,
        urlKey: 'text' | 'translation'
    ) => {
        const isReady = modelStatus[type];
        const isBusy = downloading[type];
        const prog = progress[type];

        return (
            <View style={styles.modelCard}>
                <View style={styles.modelHeader}>
                    <View style={styles.modelInfo}>
                        <Text style={styles.modelName}>{title}</Text>
                        <Text style={styles.modelSize}>{downloader.formatBytes(size)}</Text>
                    </View>
                    {isReady ? (
                        <View style={styles.badgeSuccess}>
                            <Ionicons name="checkmark-circle" size={14} color="#15803d" />
                            <Text style={styles.badgeTextSuccess}>Downloaded</Text>
                        </View>
                    ) : (
                        <View style={styles.badgeWarning}>
                            <Ionicons name="cloud-download-outline" size={14} color="#b45309" />
                            <Text style={styles.badgeTextWarning}>Missing</Text>
                        </View>
                    )}
                </View>

                <Text style={styles.modelDescription}>{desc}</Text>

                {isBusy && (
                    <View style={styles.progressContainer}>
                        <View style={styles.progressBar}>
                            <View style={[styles.progressFill, { width: `${prog}%` }]} />
                        </View>
                        <Text style={styles.progressText}>{prog.toFixed(1)}%</Text>
                    </View>
                )}

                <View style={styles.buttonsRow}>
                    {isReady ? (
                        <TouchableOpacity style={styles.deleteButton} onPress={() => handleDelete(type)}>
                            <Ionicons name="trash-outline" size={16} color="#dc2626" />
                            <Text style={styles.deleteButtonText}>Delete</Text>
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity
                            style={[styles.downloadButton, isBusy && styles.buttonDisabled]}
                            onPress={() => handleDownload(type)}
                            disabled={isBusy}
                        >
                            {isBusy ? (
                                <ActivityIndicator size="small" color="white" />
                            ) : (
                                <>
                                    <Ionicons name="cloud-download" size={16} color="white" />
                                    <Text style={styles.downloadButtonText}>Download</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    )}
                    <TouchableOpacity style={styles.urlButton} onPress={() => handleOpenUrl(downloader.getModelUrl(urlKey))}>
                        <Ionicons name="open-outline" size={16} color="#2563eb" />
                        <Text style={styles.urlButtonText}>URL</Text>
                    </TouchableOpacity>
                </View>

                {/* Individual manual pick since filenames differ */}
                <TouchableOpacity
                    style={[styles.pickButton, { marginTop: 12 }, isReady && styles.pickButtonDone]}
                    onPress={() => handlePickFile(type)}
                >
                    <Ionicons
                        name={isReady ? "checkmark-circle" : "document"}
                        size={20}
                        color={isReady ? "#15803d" : "#2563eb"}
                    />
                    <Text style={[styles.pickButtonText, isReady && { color: '#15803d' }]}>
                        {isReady ? 'File Installed ✓' : `Pick .gguf File Manually`}
                    </Text>
                </TouchableOpacity>
            </View>
        );
    };

    if (isChecking) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#2563eb" />
                <Text style={styles.loadingText}>Checking model status...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ title: 'AI Model Manager' }} />
            <ScrollView contentContainerStyle={styles.content}>

                <View style={styles.infoBox}>
                    <Text style={styles.infoTitle}>📥 Download AI Models</Text>
                    <Text style={styles.infoText}>
                        MasterJi needs models to work offline. Download Gemma for English and Sarvam-1 for multilingual translation (10 Indian languages).
                    </Text>
                </View>

                {renderModelCard(
                    'text',
                    'Gemma 3 1B (English)',
                    TEXT_MODEL_CONFIG.size,
                    'Primary text model for English content, reasoning, and Q&A.',
                    'text'
                )}

                {renderModelCard(
                    'translation',
                    'Sarvam-1 (10 Languages)',
                    TRANSLATION_MODEL_CONFIG.size,
                    'State-of-the-art translation for 22 Indian languages. Outperforms Google Translate.',
                    'translation'
                )}

                {/* Import Section */}
                <TouchableOpacity
                    style={styles.importButton}
                    onPress={handleImportFromDownloads}
                    disabled={isImporting}
                >
                    {isImporting ? (
                        <ActivityIndicator size="small" color="#2563eb" />
                    ) : (
                        <Ionicons name="folder-open-outline" size={20} color="#2563eb" />
                    )}
                    <Text style={styles.importButtonText}>
                        {isImporting ? 'Importing...' : 'Bulk Import from Downloads'}
                    </Text>
                </TouchableOpacity>

                <View style={styles.storageInfo}>
                    <Ionicons name="information-circle-outline" size={18} color="#6b7280" />
                    <Text style={styles.storageText}>
                        Models are stored in app's private storage. Safe to clean "Downloads" folder after import.
                    </Text>
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
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f3f4f6',
    },
    loadingText: {
        marginTop: 12,
        color: '#6b7280',
    },
    content: {
        padding: 16,
        paddingBottom: 32,
    },
    infoBox: {
        backgroundColor: '#eff6ff',
        padding: 16,
        borderRadius: 12,
        marginBottom: 16,
        borderLeftWidth: 4,
        borderLeftColor: '#2563eb',
    },
    infoTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1e40af',
        marginBottom: 4,
    },
    infoText: {
        fontSize: 14,
        color: '#3b82f6',
        lineHeight: 20,
    },
    modelCard: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    modelHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    modelInfo: {
        flex: 1,
    },
    modelName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1f2937',
    },
    modelSize: {
        fontSize: 12,
        color: '#6b7280',
        marginTop: 2,
    },
    modelDescription: {
        fontSize: 14,
        color: '#6b7280',
        marginBottom: 12,
    },
    badgeSuccess: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#dcfce7',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        gap: 4,
    },
    badgeTextSuccess: {
        fontSize: 12,
        color: '#15803d',
        fontWeight: '600',
    },
    badgeWarning: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fef3c7',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        gap: 4,
    },
    badgeTextWarning: {
        fontSize: 12,
        color: '#b45309',
        fontWeight: '600',
    },
    progressContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 12,
    },
    progressBar: {
        flex: 1,
        height: 8,
        backgroundColor: '#e5e7eb',
        borderRadius: 4,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: '#2563eb',
        borderRadius: 4,
    },
    progressText: {
        fontSize: 12,
        color: '#6b7280',
        width: 50,
        textAlign: 'right',
    },
    buttonsRow: {
        flexDirection: 'row',
        gap: 8,
    },
    downloadButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#2563eb',
        padding: 12,
        borderRadius: 8,
        gap: 6,
    },
    downloadButtonText: {
        color: 'white',
        fontWeight: '600',
    },
    deleteButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fee2e2',
        padding: 12,
        borderRadius: 8,
        gap: 6,
    },
    deleteButtonText: {
        color: '#dc2626',
        fontWeight: '600',
    },
    urlButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#dbeafe',
        padding: 12,
        borderRadius: 8,
        gap: 4,
        minWidth: 70,
    },
    urlButtonText: {
        color: '#2563eb',
        fontWeight: '600',
    },
    buttonDisabled: {
        opacity: 0.6,
    },
    importButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#dbeafe',
        padding: 16,
        borderRadius: 12,
        marginBottom: 16,
        gap: 8,
        borderWidth: 2,
        borderColor: '#93c5fd',
        borderStyle: 'dashed',
    },
    importButtonText: {
        color: '#2563eb',
        fontWeight: '600',
        fontSize: 15,
    },
    manualSection: {
        backgroundColor: '#f0fdf4',
        padding: 16,
        borderRadius: 12,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#86efac',
    },
    manualTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: '#166534',
        marginBottom: 4,
    },
    manualDesc: {
        fontSize: 13,
        color: '#15803d',
        marginBottom: 12,
    },
    pickButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'white',
        padding: 14,
        borderRadius: 8,
        gap: 8,
        borderWidth: 1,
        borderColor: '#93c5fd',
    },
    pickButtonDone: {
        backgroundColor: '#dcfce7',
        borderColor: '#86efac',
    },
    pickButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#2563eb',
    },
    storageInfo: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 8,
        paddingHorizontal: 4,
    },
    storageText: {
        fontSize: 12,
        color: '#6b7280',
        flex: 1,
        lineHeight: 18,
    },
});
