import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
  FlatList,
} from 'react-native';
import { useGitStore } from '../../src/state';
import { getConnection } from '../../src/connection';

function safeJsonStr(s: string): string {
  return s
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');
}

export default function GitScreen() {
  const {
    status,
    diffText,
    feedback,
    branches,
    setFeedback,
    setDiffText,
  } = useGitStore();
  const [commitMessage, setCommitMessage] = useState('');
  const [showCommitDialog, setShowCommitDialog] = useState(false);
  const conn = getConnection();

  const branchName = status.current ?? '??';
  const files = Array.isArray(status.files) ? status.files : [];
  const branchList = Array.isArray(branches) ? branches : [];

  const handleStage = (paths: string[]) => {
    const pathsJson = paths.map((p) => `"${safeJsonStr(p)}"`).join(',');
    conn.send(`{"t":"git.stage","paths":[${pathsJson}]}`);
  };

  const handleCommit = () => {
    if (!commitMessage.trim()) return;
    conn.send(`{"t":"git.commit","message":"${safeJsonStr(commitMessage.trim())}"}`);
    setCommitMessage('');
    setShowCommitDialog(false);
  };

  return (
    <View style={styles.container}>
      {/* Status bar */}
      <View style={styles.statusBar}>
        <Text style={styles.branchText}>⎇ {branchName}</Text>
        <Text style={styles.fileCount}>{files.length} changes</Text>
      </View>

      {/* Feedback */}
      {feedback && (
        <View style={styles.feedback}>
          <Text style={styles.feedbackText}>{feedback}</Text>
          <Pressable onPress={() => setFeedback(null)}>
            <Text style={styles.dismissText}>✕</Text>
          </Pressable>
        </View>
      )}

      {/* Actions */}
      <View style={styles.actions}>
        <Pressable
          style={styles.actionButton}
          onPress={() => handleStage(files.map((f: any) => f.path ?? '').filter(Boolean))}
        >
          <Text style={styles.actionText}>Stage All</Text>
        </Pressable>
        <Pressable style={styles.actionButton} onPress={() => setShowCommitDialog(true)}>
          <Text style={styles.actionText}>Commit</Text>
        </Pressable>
        <Pressable
          style={styles.actionButton}
          onPress={() => conn.send('{"t":"git.push"}')}
        >
          <Text style={styles.actionText}>Push</Text>
        </Pressable>
        <Pressable
          style={styles.actionButton}
          onPress={() => conn.send('{"t":"git.pull"}')}
        >
          <Text style={styles.actionText}>Pull</Text>
        </Pressable>
      </View>

      {/* Branches */}
      {branchList.length > 0 && (
        <View style={styles.branchesSection}>
          <Text style={styles.sectionTitle}>Branches</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {branchList.map((b) => (
              <Pressable
                key={b}
                style={[
                  styles.branchChip,
                  b === branchName && styles.branchChipActive,
                ]}
                onPress={() =>
                  conn.send(
                    `{"t":"git.checkout","name":"${safeJsonStr(b)}"}`
                  )
                }
              >
                <Text
                  style={[
                    styles.branchChipText,
                    b === branchName && styles.branchChipTextActive,
                  ]}
                >
                  {b}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}

      {/* File list */}
      {files.length > 0 ? (
        <FlatList
          data={files}
          keyExtractor={(_: any, i: number) => i.toString()}
          renderItem={({ item }: { item: any }) => (
            <Pressable
              style={styles.fileRow}
              onPress={() =>
                conn.send(
                  `{"t":"git.diff","path":"${safeJsonStr(item.path ?? '')}","staged":false}`
                )
              }
            >
              <Text style={styles.fileStatus}>
                {item.status === 'modified' ? 'M' : item.status === 'added' ? 'A' : item.status === 'deleted' ? 'D' : '?'}
              </Text>
              <Text style={styles.filePath} numberOfLines={1}>
                {item.path ?? ''}
              </Text>
            </Pressable>
          )}
          style={styles.fileList}
        />
      ) : (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No changes.</Text>
        </View>
      )}

      {/* Diff view */}
      {diffText ? (
        <View style={styles.diffSection}>
          <View style={styles.diffHeader}>
            <Text style={styles.sectionTitle}>Diff</Text>
            <Pressable onPress={() => setDiffText('')}>
              <Text style={styles.dismissText}>Close</Text>
            </Pressable>
          </View>
          <ScrollView style={styles.diffScroll}>
            <Text style={styles.diffText}>{diffText}</Text>
          </ScrollView>
        </View>
      ) : null}

      {/* Commit dialog */}
      {showCommitDialog && (
        <View style={styles.dialogOverlay}>
          <View style={styles.dialog}>
            <Text style={styles.dialogTitle}>Commit changes</Text>
            <TextInput
              style={styles.dialogInput}
              value={commitMessage}
              onChangeText={setCommitMessage}
              placeholder="Commit message"
              placeholderTextColor="#6B7280"
              multiline
            />
            <View style={styles.dialogActions}>
              <Pressable onPress={() => setShowCommitDialog(false)}>
                <Text style={styles.dialogCancel}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.dialogConfirm,
                  !commitMessage.trim() && styles.dialogConfirmDisabled,
                ]}
                onPress={handleCommit}
              >
                <Text style={styles.dialogConfirmText}>Commit</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F0F10' },
  statusBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#1A1A1C',
  },
  branchText: { color: '#22C55E', fontFamily: 'monospace', fontSize: 14 },
  fileCount: { color: '#6B7280', fontSize: 12 },
  feedback: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#1A3A2A',
    marginHorizontal: 8,
    marginTop: 8,
    borderRadius: 8,
  },
  feedbackText: { color: '#4ADE80', fontSize: 13, flex: 1 },
  dismissText: { color: '#6B7280', fontSize: 14, paddingLeft: 8 },
  actions: {
    flexDirection: 'row',
    padding: 8,
    gap: 8,
  },
  actionButton: {
    backgroundColor: '#252528',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  actionText: { color: '#E8E3DD', fontSize: 13, fontWeight: '600' },
  branchesSection: { padding: 8 },
  sectionTitle: {
    color: '#B5B0AB',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  branchChip: {
    backgroundColor: '#252528',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 6,
  },
  branchChipActive: { backgroundColor: '#D97757' },
  branchChipText: { color: '#E8E3DD', fontFamily: 'monospace', fontSize: 12 },
  branchChipTextActive: { color: '#FFFFFF' },
  fileList: { flex: 1 },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#252528',
  },
  fileStatus: {
    color: '#EAB308',
    fontFamily: 'monospace',
    fontSize: 13,
    width: 20,
  },
  filePath: { color: '#E8E3DD', fontSize: 13, flex: 1 },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: { color: '#6B7280', fontSize: 14 },
  diffSection: { padding: 8, flex: 1 },
  diffHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  diffScroll: { flex: 1, backgroundColor: '#1A1A1C', borderRadius: 8, padding: 8 },
  diffText: {
    color: '#E8E3DD',
    fontFamily: 'monospace',
    fontSize: 12,
    lineHeight: 18,
  },
  dialogOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dialog: {
    backgroundColor: '#1A1A1C',
    borderRadius: 12,
    padding: 20,
    width: '80%',
  },
  dialogTitle: { color: '#E8E3DD', fontSize: 16, fontWeight: '600', marginBottom: 12 },
  dialogInput: {
    backgroundColor: '#0F0F10',
    color: '#E8E3DD',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    fontFamily: 'monospace',
    minHeight: 80,
  },
  dialogActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
    gap: 16,
  },
  dialogCancel: { color: '#6B7280', fontSize: 14 },
  dialogConfirm: {
    backgroundColor: '#D97757',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
  },
  dialogConfirmDisabled: { opacity: 0.5 },
  dialogConfirmText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
});
