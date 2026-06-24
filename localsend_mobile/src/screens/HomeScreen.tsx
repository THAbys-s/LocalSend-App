import { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';

import { useTheme } from '../hooks/useTheme';
import { useDiscovery } from '../hooks/useDiscovery';
import { useTransfer } from '../hooks/useTransfer';
import { RadarAnimation } from '../components/RadarAnimation';
import { DeviceCard } from '../components/DeviceCard';
import { TransferProgressSheet } from '../components/TransferProgressSheet';
import { DiscoveredDevice } from '../services/DiscoveryService';
import { FileToSend } from '../services/TransferService';
import { useForegroundService } from '../hooks/useForegroundService';

const SCAN_STATUS_LABEL: Record<string, string> = {
  idle:     'Toca para escanear',
  checking: 'Verificando Wi-Fi...',
  scanning: 'Buscando dispositivos...',
  no_wifi:  'Conectate a Wi-Fi primero',
  error:    'Error de red',
};

export function HomeScreen() {
  const { colors, t, s, r } = useTheme();
  const { devices, status, error, start, stop, ping } = useDiscovery();
  const { progress, send, cancel, reset, isSending }  = useTransfer();

  const [selectedFile,   setSelectedFile  ] = useState<FileToSend | null>(null);
  const [selectedDevice, setSelectedDevice] = useState<DiscoveredDevice | null>(null);

  useEffect(() => {
    start();
    return () => stop();
  }, []);

  const pickDocument = useCallback(async () => {
    const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });
    if (result.canceled) return;

    const asset = result.assets[0];
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedFile({
      uri:  asset.uri,
      name: asset.name,
      size: asset.size ?? 0,
      type: asset.mimeType ?? 'application/octet-stream',
    });
  }, []);

  const pickImage = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== 'granted') {
      Alert.alert(
        'Permiso requerido',
        'Necesitamos acceso a tu galería para enviar imágenes.',
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images", "videos"],
      quality: 1,
    });

    if (result.canceled) return;

    const asset = result.assets[0];
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedFile({
      uri: asset.uri,
      name: asset.fileName ?? 'photo.jpg',
      size: asset.fileSize ?? 0,
      type: asset.type === 'video' ? 'video/mp4' : 'image/jpeg',
      thumbnailUri: asset.uri,
    });
  }, []);

  const handleDevicePress = useCallback((device: DiscoveredDevice) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedDevice(device);
  }, []);

  const handleSend = useCallback(async () => {
    if (!selectedFile || !selectedDevice) return;
    try {
      await send(selectedDevice, selectedFile);
    } catch (err: any) {
      Alert.alert('Error al enviar', err.message);
    }
  }, [selectedFile, selectedDevice, send]);

  const handleDismiss = useCallback(() => {
    reset();
    if (progress?.status === 'success') {
      setSelectedFile(null);
      setSelectedDevice(null);
    }
  }, [progress, reset]);

  const canSend    = !!selectedFile && !!selectedDevice && !isSending;
  const isScanning = status === 'scanning';
  const isNoWifi   = status === 'no_wifi';

  useForegroundService(
    isSending,
    progress ? `Enviando ${progress.fileName}...` : 'Transferencia en curso...'
  );

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingHorizontal: s.base }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >

        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.appName, { color: colors.text, fontSize: t.sizes.xl, fontWeight: t.weights.bold }]}>
            LocalSend
          </Text>
          <TouchableOpacity onPress={ping} style={styles.refreshBtn}>
            <Text style={[styles.refreshIcon, { color: colors.primary }]}>↻</Text>
          </TouchableOpacity>
        </View>

        {/* Radar */}
        <View style={styles.radarSection}>
          <RadarAnimation size={260} active={isScanning} />
          <Text style={[styles.scanLabel, { color: isNoWifi ? colors.warning : colors.textSecondary, fontSize: t.sizes.sm }]}>
            {error ?? SCAN_STATUS_LABEL[status]}
          </Text>
          {isNoWifi && (
            <TouchableOpacity onPress={start} style={[styles.retryBtn, { backgroundColor: colors.primary }]}>
              <Text style={styles.retryBtnText}>Reintentar</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Devices */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary, fontSize: t.sizes.xs, fontWeight: t.weights.semibold }]}>
            DISPOSITIVOS{devices.length > 0 ? ` (${devices.length})` : ''}
          </Text>

          {isScanning && devices.length === 0 && (
            <>
              <View style={[styles.skeleton, { backgroundColor: colors.border, borderRadius: r.lg }]} />
              <View style={[styles.skeleton, { backgroundColor: colors.border, borderRadius: r.lg, opacity: 0.5 }]} />
            </>
          )}

          {!isScanning && devices.length === 0 && (
            <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderRadius: r.lg }]}>
              <Text style={styles.emptyEmoji}>🖥</Text>
              <Text style={[styles.emptyTitle, { color: colors.text, fontWeight: t.weights.semibold }]}>
                Sin dispositivos
              </Text>
              <Text style={[styles.emptyHint, { color: colors.textSecondary, fontSize: t.sizes.sm }]}>
                Asegurate de estar en la misma red Wi-Fi que la app de escritorio
              </Text>
            </View>
          )}

          {devices.map(device => (
            <DeviceCard
              key={device.id}
              device={device}
              selected={selectedDevice?.id === device.id}
              onPress={handleDevicePress}
            />
          ))}
        </View>

        {/* File picker */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary, fontSize: t.sizes.xs, fontWeight: t.weights.semibold }]}>
            ARCHIVO A ENVIAR
          </Text>

          {selectedFile ? (
            <View style={[styles.selectedFile, { backgroundColor: colors.surface, borderRadius: r.lg }]}>
              <Text style={styles.selectedFileEmoji}>
                {selectedFile.thumbnailUri ? '🖼' : '📄'}
              </Text>
              <View style={styles.selectedFileInfo}>
                <Text numberOfLines={1} style={[{ color: colors.text, fontWeight: t.weights.medium, fontSize: t.sizes.base }]}>
                  {selectedFile.name}
                </Text>
                <Text style={[{ color: colors.textSecondary, fontSize: t.sizes.sm }]}>
                  {(selectedFile.size / 1024 / 1024).toFixed(1)} MB
                </Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedFile(null)}>
                <Text style={[{ color: colors.textMuted, fontSize: 20 }]}>✕</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.pickerRow}>
              <TouchableOpacity
                onPress={pickDocument}
                style={[styles.pickerBtn, { backgroundColor: colors.surface, borderRadius: r.lg, marginRight: s.sm }]}
              >
                <Text style={styles.pickerEmoji}>📁</Text>
                <Text style={[styles.pickerLabel, { color: colors.text, fontSize: t.sizes.sm }]}>Documento</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={pickImage}
                style={[styles.pickerBtn, { backgroundColor: colors.surface, borderRadius: r.lg }]}
              >
                <Text style={styles.pickerEmoji}>🖼</Text>
                <Text style={[styles.pickerLabel, { color: colors.text, fontSize: t.sizes.sm }]}>Galería</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Send button */}
        {canSend && (
          <TouchableOpacity
            onPress={handleSend}
            activeOpacity={0.85}
            style={[styles.sendBtn, { backgroundColor: colors.primary, borderRadius: r.lg }]}
          >
            <Text style={styles.sendBtnText}>
              Enviar a {selectedDevice!.alias.split(' ').slice(-2).join(' ')}
            </Text>
            <Text style={styles.sendBtnArrow}>→</Text>
          </TouchableOpacity>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Progress sheet */}
      {progress && (
        <TransferProgressSheet
          progress={progress}
          onCancel={cancel}
          onDismiss={handleDismiss}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root:   { flex: 1 },
  scroll: { paddingTop: 16 },

  header: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
    marginBottom:    8,
  },
  appName:     { letterSpacing: -0.5 },
  refreshBtn:  { padding: 8 },
  refreshIcon: { fontSize: 22 },

  radarSection: {
    alignItems:    'center',
    paddingVertical: 24,
  },
  scanLabel: {
    marginTop:     14,
    letterSpacing: 0.2,
  },
  retryBtn: {
    marginTop:         12,
    paddingHorizontal: 24,
    paddingVertical:   10,
    borderRadius:      20,
  },
  retryBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },

  section:      { marginBottom: 24 },
  sectionLabel: { letterSpacing: 0.8, marginBottom: 12 },

  skeleton: {
    height:       72,
    marginBottom: 10,
  },

  emptyCard: {
    alignItems: 'center',
    padding:    32,
  },
  emptyEmoji: { fontSize: 40, marginBottom: 12 },
  emptyTitle: { fontSize: 16, marginBottom: 6 },
  emptyHint:  { textAlign: 'center', lineHeight: 20 },

  selectedFile: {
    flexDirection: 'row',
    alignItems:    'center',
    padding:       16,
  },
  selectedFileEmoji: { fontSize: 28, marginRight: 14 },
  selectedFileInfo:  { flex: 1 },

  pickerRow: { flexDirection: 'row' },
  pickerBtn: {
    flex:            1,
    alignItems:      'center',
    paddingVertical: 24,
    shadowColor:     '#000',
    shadowOffset:    { width: 0, height: 2 },
    shadowOpacity:   0.05,
    shadowRadius:    8,
    elevation:       2,
  },
  pickerEmoji: { fontSize: 32, marginBottom: 8 },
  pickerLabel: { fontWeight: '500' },

  sendBtn: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'center',
    paddingVertical: 18,
    marginBottom:    16,
    gap:             8,
    shadowColor:     '#00C896',
    shadowOffset:    { width: 0, height: 4 },
    shadowOpacity:   0.3,
    shadowRadius:    12,
    elevation:       8,
  },
  sendBtnText:  { color: '#fff', fontSize: 17, fontWeight: '700', letterSpacing: -0.3 },
  sendBtnArrow: { color: '#fff', fontSize: 20, fontWeight: '300' },
});
