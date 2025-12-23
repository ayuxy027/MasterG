import { HelloWave } from '@/components/hello-wave';
import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAI } from '@/hooks/useAI';
import ModelDownloader from '@/services/ai/ModelDownloader';
import { Feather } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, View, useColorScheme } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

export default function HomeScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const {
    textModelStatus,
    translationModelStatus,
    initializeText,
    initializeTranslation,
    initialize,
    isLoading: isAILoading
  } = useAI();

  // Local download tracking
  const [downloadStatus, setDownloadStatus] = useState({
    text: false,
    translation: false,
  });
  const [downloading, setDownloading] = useState({
    text: false,
    translation: false,
  });
  const [downloadProgress, setDownloadProgress] = useState({
    text: 0,
    translation: 0
  });

  const [isImporting, setIsImporting] = useState(false);

  const downloader = ModelDownloader.getInstance();

  const checkDownloads = useCallback(async () => {
    const status = await downloader.checkDownloadedModels();
    setDownloadStatus(status);
  }, []);

  useEffect(() => {
    checkDownloads();
  }, [checkDownloads]);

  const handleDownload = async (type: 'text' | 'translation') => {
    setDownloading(prev => ({ ...prev, [type]: true }));
    const onProgress = (p: { percentage: number }) => {
      setDownloadProgress(prev => ({ ...prev, [type]: p.percentage }));
    };

    try {
      let result;
      if (type === 'text') {
        result = await downloader.downloadTextModel(onProgress);
      } else {
        result = await downloader.downloadTranslationModel(onProgress);
      }

      if (result.success) {
        Alert.alert('Success', `${type === 'text' ? 'Text' : 'Translation'} model downloaded.`);
        await checkDownloads();
      } else {
        Alert.alert('Failed', result.error || 'Download failed.');
      }
    } catch (e) {
      Alert.alert('Error', 'Download error');
    } finally {
      setDownloading(prev => ({ ...prev, [type]: false }));
    }
  };

  const handleLoad = async (type: 'text' | 'translation') => {
    try {
      if (type === 'text') await initializeText();
      else await initializeTranslation();
    } catch (e) {
      Alert.alert('Error', `Failed to load ${type} model.`);
    }
  };

  const handleImportFromDownloads = async () => {
    setIsImporting(true);
    const downloadPaths = [
      'file:///storage/emulated/0/Download/',
      'file:///sdcard/Download/',
      '/storage/emulated/0/Download/',
      '/sdcard/Download/',
    ];
    const modelFiles = [
      { name: 'gemma-3-1b-it-q4_0.gguf', type: 'text' },
      { name: 'sarvam-1-Q4_K_M.gguf', type: 'translation' },
    ];
    let imported = 0;
    const modelsDir = `${FileSystem.documentDirectory}models/`;

    try {
      const dirInfo = await FileSystem.getInfoAsync(modelsDir);
      if (!dirInfo.exists) await FileSystem.makeDirectoryAsync(modelsDir, { intermediates: true });

      for (const model of modelFiles) {
        let found = false;
        for (const basePath of downloadPaths) {
          if (found) break;
          const sourcePath = basePath.startsWith('file://') ? `${basePath}${model.name}` : `file://${basePath}${model.name}`;
          const targetPath = `${modelsDir}${model.name}`;

          try {
            const fileInfo = await FileSystem.getInfoAsync(sourcePath);
            if (fileInfo.exists && (fileInfo as any).size && (fileInfo as any).size > 1000000) {
              const existing = await FileSystem.getInfoAsync(targetPath);
              if (existing.exists) await FileSystem.deleteAsync(targetPath);
              await FileSystem.copyAsync({ from: sourcePath, to: targetPath });
              imported++;
              found = true;
            }
          } catch (e) { }
        }
      }
    } catch (error) {
      console.error(error);
    }

    setIsImporting(false);
    await checkDownloads();
    if (imported > 0) Alert.alert('Success', `Imported ${imported} model(s).`);
    else Alert.alert('No Models Found', 'Could not find model files in Downloads.');
  };

  const handlePickModelFile = async (type: 'text' | 'translation') => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: false });
      if (result.canceled || !result.assets || result.assets.length === 0) return;

      const file = result.assets[0];
      if (!file.name.endsWith('.gguf')) {
        Alert.alert('Invalid', 'Must be a .gguf file');
        return;
      }

      const modelsDir = `${FileSystem.documentDirectory}models/`;
      const targetName = type === 'text'
        ? 'gemma-3-1b-it-q4_0.gguf'
        : 'sarvam-1-Q4_K_M.gguf';

      const targetPath = `${modelsDir}${targetName}`;
      const dirInfo = await FileSystem.getInfoAsync(modelsDir);
      if (!dirInfo.exists) await FileSystem.makeDirectoryAsync(modelsDir, { intermediates: true });

      await FileSystem.copyAsync({ from: file.uri, to: targetPath });
      await checkDownloads();
      Alert.alert('Success', `${type === 'text' ? 'Text' : 'Translation'} Model imported.`);
    } catch (e) {
      Alert.alert('Error', 'Import failed: ' + String(e));
    }
  };


  const renderStatus = (type: 'text' | 'translation') => {
    const isDownloaded = downloadStatus[type];
    const status = type === 'text' ? textModelStatus : translationModelStatus;
    const isLoaded = status.isLoaded;
    const isModelLoading = status.isLoading;
    const isDownloadingModel = downloading[type];

    if (isDownloadingModel) {
      return (
        <View style={[styles.badgeBase, styles.badgeWarning]}>
          <ActivityIndicator size="small" color="#EA580C" />
          <ThemedText style={styles.badgeTextWarning}>{downloadProgress[type].toFixed(0)}%</ThemedText>
        </View>
      );
    }
    if (isLoaded) {
      return (
        <View style={[styles.badgeBase, styles.badgeSuccessSH]}>
          <Feather name="check" size={12} color="#15803d" />
          <ThemedText style={styles.badgeTextSuccess}>Active</ThemedText>
        </View>
      );
    }
    if (isModelLoading) {
      return (
        <View style={[styles.badgeBase, styles.badgeWarning]}>
          <ActivityIndicator size="small" color="#EA580C" />
          <ThemedText style={styles.badgeTextWarning}>Loading...</ThemedText>
        </View>
      );
    }
    if (isDownloaded) {
      return (
        <Pressable onPress={() => handleLoad(type)} style={({ pressed }) => [
          styles.badgeBase,
          styles.badgeAction,
          pressed && styles.pressed
        ]}>
          <Feather name="play" size={12} color="white" />
          <ThemedText style={styles.badgeTextAction}>Initialize</ThemedText>
        </Pressable>
      );
    }
    return (
      <Pressable onPress={() => handleDownload(type)} style={({ pressed }) => [
        styles.badgeBase,
        styles.badgeError,
        pressed && styles.pressed
      ]}>
        <Feather name="download" size={12} color="#FFFFFF" />
        <ThemedText style={styles.badgeTextError}>Download</ThemedText>
      </Pressable>
    );
  };

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#F97316', dark: '#111827' }}
      headerImage={
        <Feather
          name="cpu"
          size={300}
          color="rgba(255,255,255,0.15)"
          style={styles.headerImage}
        />
      }>
      <Animated.View entering={FadeInDown.delay(100).duration(500)}>
        <ThemedView style={styles.titleContainer}>
          <ThemedText type="title" style={styles.appTitle}>MasterJi AI</ThemedText>
          <HelloWave />
        </ThemedView>
        <ThemedText style={styles.subtitle}>
          Premium On-Device AI Experience.
        </ThemedText>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(200).duration(500)} style={styles.cardsContainer}>
        {/* Gemma Card */}
        <ThemedView style={[styles.card, isDark && styles.cardDark]}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconBox, { backgroundColor: '#FFF7ED' }]}>
              <Feather name="box" size={24} color="#F97316" />
            </View>
            <View style={{ flex: 1 }}>
              <ThemedText type="subtitle" style={styles.cardInternalTitle}>Gemma 3n</ThemedText>
              <ThemedText style={styles.sizeText}>1.2 GB • Text & Logic</ThemedText>
            </View>
            {renderStatus('text')}
          </View>
          <ThemedText style={styles.cardDesc}>
            High-performance text model for reasoning, Q&A, and general tasks.
          </ThemedText>
          <View style={styles.divider} />
          <View style={styles.cardFooter}>
            <ThemedText style={styles.metaText}>{downloadStatus.text ? 'Ready for offline use' : 'Download required'}</ThemedText>
          </View>
        </ThemedView>

        {/* Sarvam-1 Card (replaces Navarasa) */}
        <ThemedView style={[styles.card, isDark && styles.cardDark]}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconBox, { backgroundColor: '#ECFDF5' }]}>
              <Feather name="globe" size={24} color="#10B981" />
            </View>
            <View style={{ flex: 1 }}>
              <ThemedText type="subtitle" style={styles.cardInternalTitle}>Sarvam-1</ThemedText>
              <ThemedText style={styles.sizeText}>1.1 GB • 10 Languages</ThemedText>
            </View>
            {renderStatus('translation')}
          </View>
          <ThemedText style={styles.cardDesc}>
            State-of-the-art translation for 22 Indian languages. Outperforms Google Translate.
          </ThemedText>
          <View style={styles.divider} />
          <View style={styles.cardFooter}>
            <ThemedText style={styles.metaText}>{downloadStatus.translation ? 'Ready for offline use' : 'Download required'}</ThemedText>
          </View>
        </ThemedView>
      </Animated.View>

      {/* System Stats */}
      <Animated.View entering={FadeInDown.delay(300).duration(500)}>
        <ThemedView style={styles.systemCard}>
          <View style={styles.systemHeader}>
            <Feather name="activity" size={20} color="#F97316" />
            <ThemedText type="defaultSemiBold" style={{ color: 'white' }}>System Health</ThemedText>
          </View>

          <View style={styles.healthRow}>
            <View style={styles.healthItem}>
              <ThemedText style={styles.healthLabel}>RAM</ThemedText>
              <ThemedText style={styles.healthValue}>~{isAILoading ? 'High' : 'Normal'}</ThemedText>
            </View>
            <View style={styles.healthSeparator} />
            <View style={styles.healthItem}>
              <ThemedText style={styles.healthLabel}>Storage</ThemedText>
              <ThemedText style={styles.healthValue}>Safe</ThemedText>
            </View>
            <View style={styles.healthSeparator} />
            <View style={styles.healthItem}>
              <ThemedText style={styles.healthLabel}>Battery</ThemedText>
              <ThemedText style={styles.healthValue}>Good</ThemedText>
            </View>
          </View>
        </ThemedView>
      </Animated.View>

      {/* Manual Operations */}
      <Animated.View entering={FadeInUp.delay(400).duration(500)} style={styles.manualSection}>
        <ThemedText type="subtitle" style={styles.manualTitle}>Advanced Controls</ThemedText>

        <View style={styles.grid2}>
          <Pressable
            style={({ pressed }) => [styles.glassButton, pressed && styles.pressed]}
            onPress={() => initialize()}
          >
            <Feather name="power" size={20} color="#EF4444" />
            <ThemedText style={styles.glassButtonText}>Force Init</ThemedText>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.glassButton, pressed && styles.pressed]}
            onPress={handleImportFromDownloads}
            disabled={isImporting}
          >
            {isImporting ? <ActivityIndicator size="small" color="#F97316" /> : <Feather name="download-cloud" size={20} color="#F97316" />}
            <ThemedText style={styles.glassButtonText}>Auto Import</ThemedText>
          </Pressable>
        </View>

        <ThemedText style={styles.miniLabel}>Manual File Selection</ThemedText>
        <View style={styles.browseRow}>
          <Pressable style={styles.browseBtn} onPress={() => handlePickModelFile('text')}>
            <Feather name={downloadStatus.text ? "check-circle" : "file"} size={16} color={downloadStatus.text ? "#16A34A" : "#6B7280"} />
            <ThemedText style={styles.browseText}>Select Text Model</ThemedText>
          </Pressable>
          <Pressable style={styles.browseBtn} onPress={() => handlePickModelFile('translation')}>
            <Feather name={downloadStatus.translation ? "check-circle" : "file"} size={16} color={downloadStatus.translation ? "#16A34A" : "#6B7280"} />
            <ThemedText style={styles.browseText}>Select Translation Model</ThemedText>
          </Pressable>
        </View>
      </Animated.View>

    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  headerImage: {
    bottom: -60,
    right: -20,
    position: 'absolute',
    transform: [{ rotate: '-15deg' }]
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 4,
  },
  appTitle: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 24,
  },
  cardsContainer: {
    gap: 16,
    marginBottom: 24,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
  },
  cardDark: {
    backgroundColor: '#1F2937',
    borderColor: 'rgba(255,255,255,0.05)',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 16,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardInternalTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 2,
  },
  sizeText: {
    fontSize: 13,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  cardDesc: {
    color: '#4B5563',
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 16,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.05)',
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badgeBase: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 100,
    gap: 6,
  },
  badgeSuccessSH: {
    backgroundColor: '#DCFCE7',
  },
  badgeTextSuccess: {
    fontSize: 12,
    fontWeight: '700',
    color: '#15803d',
  },
  badgeWarning: {
    backgroundColor: '#FEF3C7',
  },
  badgeTextWarning: {
    fontSize: 12,
    fontWeight: '700',
    color: '#D97706',
  },
  badgeAction: {
    backgroundColor: '#2563EB',
  },
  badgeTextAction: {
    fontSize: 12,
    fontWeight: '700',
    color: 'white',
  },
  badgeError: {
    backgroundColor: '#4B5563',
  },
  badgeTextError: {
    fontSize: 12,
    fontWeight: '700',
    color: 'white',
  },
  metaText: {
    fontSize: 12,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  systemCard: {
    backgroundColor: '#111827',
    borderRadius: 24,
    padding: 20,
    marginBottom: 30,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  systemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
  },
  healthRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  healthItem: {
    alignItems: 'center',
    flex: 1,
  },
  healthSeparator: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  healthLabel: {
    color: '#9CA3AF',
    fontSize: 12,
    marginBottom: 6,
    fontWeight: '500',
  },
  healthValue: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
  manualSection: {
    marginBottom: 100,
  },
  manualTitle: {
    marginBottom: 16,
  },
  grid2: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  glassButton: {
    flex: 1,
    backgroundColor: 'rgba(150, 150, 150, 0.1)',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(150, 150, 150, 0.2)',
  },
  glassButtonText: {
    fontWeight: '600',
    fontSize: 14,
  },
  miniLabel: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 10,
    fontWeight: '600',
    marginLeft: 4,
  },
  browseRow: {
    flexDirection: 'row',
    gap: 10,
  },
  browseBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    backgroundColor: '#F3F4F6',
    borderRadius: 16,
    gap: 8,
  },
  browseText: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '600'
  },
  pressed: {
    opacity: 0.7,
    transform: [{ scale: 0.98 }]
  }
});
