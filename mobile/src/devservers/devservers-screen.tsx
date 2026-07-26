import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  TextInput,
  ScrollView,
} from 'react-native';
import { useDevServerStore } from '../../src/state';
import { getConnection } from '../../src/connection';

function safeJsonStr(s: string): string {
  return s
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');
}

export function DevServersScreen() {
  const { servers, logs } = useDevServerStore();
  const [newCommand, setNewCommand] = useState('');
  const [showStartDialog, setShowStartDialog] = useState(false);
  const [viewingLog, setViewingLog] = useState<number | null>(null);
  const conn = getConnection();

  const handleRefresh = () => conn.send('{"t":"devservers"}');

  const handleStart = () => {
    if (!newCommand.trim()) return;
    conn.send(`{"t":"devserver.start","cmd":"${safeJsonStr(newCommand.trim())}"}`);
    setNewCommand('');
    setShowStartDialog(false);
    setTimeout(handleRefresh, 500);
  };

  const handleStop = (pid: number) => {
    conn.send(`{"t":"devserver.stop","pid":${pid}}`);
    setTimeout(handleRefresh, 500);
  };

  const handleFollow = (port: number) => {
    conn.send(`{"t":"devserver.log","port":${port},"follow":true}`);
    setViewingLog(port);
  };

  return (
    <View style={styles.container}>
      {/* Header actions */}
      <View style={styles.actions}>
        <Pressable style={styles.button} onPress={handleRefresh}>
          <Text style={styles.buttonText}>Refresh</Text>
        </Pressable>
        <Pressable
          style={[styles.button, styles.buttonPrimary]}
          onPress={() => setShowStartDialog(true)}
        >
          <Text style={styles.buttonPrimaryText}>+ Start Server</Text>
        </Pressable>
      </View>

      {/* Start dialog */}
      {showStartDialog && (
        <View style={styles.startDialog}>
          <TextInput
            style={styles.startInput}
            value={newCommand}
            onChangeText={setNewCommand}
            placeholder="e.g. npm run dev"
            placeholderTextColor="#6B7280"
            autoCapitalize="none"
          />
          <View style={styles.startActions}>
            <Pressable onPress={() => setShowStartDialog(false)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[styles.startButton, !newCommand.trim() && styles.buttonDisabled]}
              onPress={handleStart}
            >
              <Text style={styles.buttonPrimaryText}>Start</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* Server list */}
      {servers.length > 0 ? (
        <FlatList
          data={servers}
          keyExtractor={(s) => s.pid.toString()}
          renderItem={({ item }) => (
            <View style={styles.serverRow}>
              <View style={styles.serverInfo}>
                <Text style={styles.serverCmd} numberOfLines={1}>
                  {item.cmd}
                </Text>
                <Text style={styles.serverMeta}>
                  PID {item.pid}
                  {item.port ? ` · Port ${item.port}` : ''}
                  {item.managed ? ' · managed' : ''}
                </Text>
              </View>
              <View style={styles.serverActions}>
                {item.port && (
                  <Pressable
                    style={styles.serverButton}
                    onPress={() => handleFollow(item.port!)}
                  >
                    <Text style={styles.serverButtonText}>Logs</Text>
                  </Pressable>
                )}
                {item.managed && (
                  <Pressable
                    style={[styles.serverButton, styles.serverStopButton]}
                    onPress={() => handleStop(item.pid)}
                  >
                    <Text style={styles.stopText}>Stop</Text>
                  </Pressable>
                )}
              </View>
            </View>
          )}
          style={styles.list}
        />
      ) : (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No dev servers detected.</Text>
          <Text style={styles.emptySubtext}>Start a dev server or tap Refresh.</Text>
        </View>
      )}

      {/* Log viewer */}
      {viewingLog != null && logs[viewingLog] && (
        <View style={styles.logContainer}>
          <View style={styles.logHeader}>
            <Text style={styles.logTitle}>Logs · Port {viewingLog}</Text>
            <Pressable onPress={() => setViewingLog(null)}>
              <Text style={styles.cancelText}>Close</Text>
            </Pressable>
          </View>
          <ScrollView style={styles.logScroll}>
            <Text style={styles.logText}>{logs[viewingLog]}</Text>
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F0F10' },
  actions: {
    flexDirection: 'row',
    padding: 12,
    gap: 8,
  },
  button: {
    backgroundColor: '#252528',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  buttonText: { color: '#E8E3DD', fontSize: 13, fontWeight: '600' },
  buttonPrimary: { backgroundColor: '#D97757' },
  buttonPrimaryText: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },
  startDialog: {
    backgroundColor: '#1A1A1C',
    margin: 12,
    padding: 12,
    borderRadius: 8,
  },
  startInput: {
    backgroundColor: '#0F0F10',
    color: '#E8E3DD',
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    fontFamily: 'monospace',
    marginBottom: 8,
  },
  startActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 16,
  },
  startButton: {
    backgroundColor: '#D97757',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 8,
  },
  buttonDisabled: { opacity: 0.5 },
  cancelText: { color: '#6B7280', fontSize: 13 },
  list: { flex: 1 },
  serverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#252528',
  },
  serverInfo: { flex: 1, marginRight: 8 },
  serverCmd: {
    color: '#E8E3DD',
    fontFamily: 'monospace',
    fontSize: 13,
    marginBottom: 2,
  },
  serverMeta: { color: '#6B7280', fontSize: 11 },
  serverActions: { flexDirection: 'row', gap: 6 },
  serverButton: {
    backgroundColor: '#252528',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  serverButtonText: { color: '#E8E3DD', fontSize: 12 },
  serverStopButton: { backgroundColor: '#3A1A1A' },
  stopText: { color: '#F87171', fontSize: 12 },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyText: { color: '#6B7280', fontSize: 14 },
  emptySubtext: { color: '#3A3A3F', fontSize: 12, marginTop: 4 },
  logContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#0F0F10',
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#1A1A1C',
  },
  logTitle: { color: '#E8E3DD', fontSize: 14, fontWeight: '600' },
  logScroll: { flex: 1, padding: 12 },
  logText: {
    color: '#E8E3DD',
    fontFamily: 'monospace',
    fontSize: 12,
    lineHeight: 18,
  },
});
