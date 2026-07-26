import { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  Modal,
  Platform,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { QrParser, type PairingQR } from '../../src/protocol';
import { useMachinesStore } from '../../src/state';
import { getConnection } from '../../src/connection';
import { saveMachines } from '../../src/persistence/machines-store';

function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export default function PairingScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [showPasteDialog, setShowPasteDialog] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [scanMessage, setScanMessage] = useState<string | null>(null);
  const consumed = useRef(false);
  const { addMachine, machines } = useMachinesStore();
  const conn = getConnection();

  const handlePair = (qr: PairingQR) => {
    const name = qr.url.replace(/^wss?:\/\//, '').split('.')[0] ?? 'Machine';
    const machine = {
      id: generateId(),
      name,
      url: qr.url,
      token: qr.token,
      fingerprint: qr.fp,
      pairedAtMs: Date.now(),
    };
    addMachine(machine);
    // Persist to SecureStore (mirrors PairedMachinesStore.save())
    saveMachines(useMachinesStore.getState().machines);
    conn.connect(machine);
    setScanMessage(null);
  };

  const handlePaste = () => {
    const parsed = QrParser.parse(pasteText);
    if (parsed) {
      handlePair(parsed);
      setShowPasteDialog(false);
      setPasteText('');
    } else {
      setScanMessage('Invalid pairing text. Please paste the full QR JSON.');
    }
  };

  const handleBarcodeScanned = ({ data }: { data: string }) => {
    if (consumed.current) return;
    const pairing = QrParser.parse(data);
    if (!pairing) {
      setScanMessage(
        "This isn't a PocketCode pairing QR. Try the code from your computer."
      );
      return;
    }
    consumed.current = true;
    handlePair(pairing);
  };

  if (!permission) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading camera…</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Pair with your computer</Text>
        <Text style={styles.subtitle}>Camera permission is needed to scan QR codes.</Text>
        <Pressable style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>Grant Camera Permission</Text>
        </Pressable>
        <Pressable
          style={styles.secondaryButton}
          onPress={() => setShowPasteDialog(true)}
        >
          <Text style={styles.secondaryButtonText}>Paste QR text manually</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Pair with your computer</Text>

      {/* Camera QR scanner */}
      <View style={styles.cameraContainer}>
        <CameraView
          style={styles.camera}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={handleBarcodeScanned}
        />
        <View style={styles.cameraOverlay}>
          <View style={styles.scanFrame} />
        </View>
      </View>

      {scanMessage && (
        <View style={styles.messageContainer}>
          <Text style={styles.messageText}>{scanMessage}</Text>
        </View>
      )}

      {/* Manual paste */}
      <Pressable
        style={styles.secondaryButton}
        onPress={() => setShowPasteDialog(true)}
      >
        <Text style={styles.secondaryButtonText}>Paste QR text manually</Text>
      </Pressable>

      {/* Paired machines quick connect */}
      {machines.length > 0 && (
        <View style={styles.machineList}>
          <Text style={styles.machineListTitle}>Paired Machines</Text>
          {machines.map((m) => (
            <Pressable
              key={m.id}
              style={styles.machineItem}
              onPress={() => {
                consumed.current = true;
                conn.connect(m);
              }}
            >
              <Text style={styles.machineName}>{m.name}</Text>
              <Text style={styles.machineUrl} numberOfLines={1}>
                {m.url.replace(/token=[^&]+/, 'token=…')}
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      {/* Paste dialog modal */}
      <Modal
        visible={showPasteDialog}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPasteDialog(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Paste pairing string</Text>
            <TextInput
              style={styles.modalInput}
              value={pasteText}
              onChangeText={setPasteText}
              placeholder="Paste the JSON pairing code here"
              placeholderTextColor="#6B7280"
              multiline
              autoCapitalize="none"
              autoCorrect={false}
            />
            <View style={styles.modalActions}>
              <Pressable onPress={() => setShowPasteDialog(false)}>
                <Text style={styles.modalCancel}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.modalConfirm,
                  !pasteText.trim() && styles.modalConfirmDisabled,
                ]}
                onPress={handlePaste}
              >
                <Text style={styles.modalConfirmText}>Pair</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F0F10', padding: 16 },
  title: { color: '#E8E3DD', fontSize: 20, fontWeight: '600', marginBottom: 8 },
  subtitle: { color: '#6B7280', fontSize: 14, marginBottom: 16 },
  loadingText: { color: '#6B7280', fontSize: 14, textAlign: 'center', marginTop: 40 },
  cameraContainer: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  camera: { flex: 1 },
  cameraOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanFrame: {
    width: 200,
    height: 200,
    borderWidth: 2,
    borderColor: '#D97757',
    borderRadius: 12,
  },
  messageContainer: {
    backgroundColor: '#3A1A1A',
    padding: 10,
    borderRadius: 8,
    marginTop: 8,
  },
  messageText: { color: '#F87171', fontSize: 13 },
  button: {
    backgroundColor: '#D97757',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  buttonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  secondaryButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryButtonText: { color: '#D97757', fontSize: 14 },
  machineList: {
    marginTop: 16,
    backgroundColor: '#1A1A1C',
    borderRadius: 8,
    padding: 12,
  },
  machineListTitle: { color: '#B5B0AB', fontSize: 12, fontWeight: '600', marginBottom: 8 },
  machineItem: {
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#252528',
  },
  machineName: { color: '#E8E3DD', fontSize: 14, fontWeight: '500' },
  machineUrl: { color: '#6B7280', fontSize: 12, fontFamily: 'monospace', marginTop: 2 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    backgroundColor: '#1A1A1C',
    borderRadius: 12,
    padding: 20,
    width: '88%',
  },
  modalTitle: { color: '#E8E3DD', fontSize: 16, fontWeight: '600', marginBottom: 12 },
  modalInput: {
    backgroundColor: '#0F0F10',
    color: '#E8E3DD',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    fontFamily: 'monospace',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
    gap: 16,
  },
  modalCancel: { color: '#6B7280', fontSize: 14 },
  modalConfirm: {
    backgroundColor: '#D97757',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
  },
  modalConfirmDisabled: { opacity: 0.5 },
  modalConfirmText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
});
