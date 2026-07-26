import { useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';
import type {
  ExpoSpeechRecognitionResultEvent,
  ExpoSpeechRecognitionErrorEvent,
} from 'expo-speech-recognition';
import { getConnection } from '../connection';
import { useTerminalStore } from '../state';

function safeJsonStr(s: string): string {
  return s
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');
}

interface VoiceScreenProps {
  onClose?: () => void;
}

export function VoiceScreen({ onClose }: VoiceScreenProps) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const tabs = useTerminalStore((s) => s.tabs);
  const activeTabIndex = useTerminalStore((s) => s.activeTabIndex);
  const transcriptRef = useRef('');
  const conn = getConnection();

  transcriptRef.current = transcript;

  useSpeechRecognitionEvent('result', (event: ExpoSpeechRecognitionResultEvent) => {
    const text = event.results[0]?.transcript ?? '';
    setTranscript(text);
  });

  useSpeechRecognitionEvent('error', (event: ExpoSpeechRecognitionErrorEvent) => {
    setError(event.message ?? 'Speech recognition error');
    setIsListening(false);
  });

  const startListening = useCallback(async () => {
    try {
      setError(null);
      setTranscript('');

      const perm = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!perm.granted) {
        setError('Microphone permission required');
        return;
      }

      ExpoSpeechRecognitionModule.start({
        lang: 'en-US',
        continuous: false,
        interimResults: true,
      });
      setIsListening(true);
    } catch (err: any) {
      setError(err.message || 'Failed to start speech recognition');
    }
  }, []);

  const stopListening = useCallback(async () => {
    try {
      ExpoSpeechRecognitionModule.stop();
      setIsListening(false);
      if (transcriptRef.current && tabs[activeTabIndex]) {
        const tabId = tabs[activeTabIndex].id;
        conn.send(
          `{"t":"term.input","tab":"${tabId}","data":"${safeJsonStr(transcriptRef.current + '\\n')}"}`
        );
        onClose?.();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to stop speech recognition');
    }
  }, [tabs, activeTabIndex, conn, onClose]);

  const activeTab = tabs[activeTabIndex];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Voice Input</Text>

      {!activeTab ? (
        <Text style={styles.subtitle}>
          No active terminal. Open a terminal first.
        </Text>
      ) : (
        <>
          <Text style={styles.activeTab}>
            Sending to: {activeTab.title}
          </Text>

          <View style={styles.transcriptContainer}>
            <Text style={styles.transcriptLabel}>
              {isListening ? 'Listening…' : 'Transcript'}
            </Text>
            <Text style={styles.transcript}>
              {transcript || 'Tap the microphone to start speaking'}
            </Text>
          </View>

          <Pressable
            style={[
              styles.micButton,
              isListening && styles.micButtonActive,
            ]}
            onPress={isListening ? stopListening : startListening}
          >
            <Text style={styles.micButtonText}>
              {isListening ? '⏹ Stop' : '🎤 Start'}
            </Text>
          </Pressable>
        </>
      )}

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F0F10', padding: 20, alignItems: 'center' },
  title: { color: '#E8E3DD', fontSize: 24, fontWeight: '600', marginBottom: 16 },
  subtitle: { color: '#6B7280', fontSize: 14, marginTop: 24 },
  activeTab: { color: '#B5B0AB', fontSize: 13, marginBottom: 24 },
  transcriptContainer: {
    width: '100%',
    backgroundColor: '#1A1A1C',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    minHeight: 120,
  },
  transcriptLabel: { color: '#B5B0AB', fontSize: 12, fontWeight: '600', marginBottom: 8 },
  transcript: {
    color: '#E8E3DD',
    fontSize: 16,
    lineHeight: 24,
    fontFamily: 'monospace',
  },
  micButton: {
    backgroundColor: '#D97757',
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  micButtonActive: {
    backgroundColor: '#EF4444',
  },
  micButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  errorContainer: {
    backgroundColor: '#3A1A1A',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
    width: '100%',
  },
  errorText: { color: '#F87171', fontSize: 13, textAlign: 'center' },
});
