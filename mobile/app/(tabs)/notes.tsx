import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  TextInput,
} from 'react-native';
import {
  getAllNotes,
  addNote,
  updateNote,
  deleteNote,
  type Note,
} from '../../src/persistence/database';
import { useTerminalStore } from '../../src/state';
import { getConnection } from '../../src/connection';

function safeJsonStr(s: string): string {
  return s
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');
}

export default function NotesScreen() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [content, setContent] = useState('');
  const tabs = useTerminalStore((s) => s.tabs);
  const activeTabIndex = useTerminalStore((s) => s.activeTabIndex);
  const conn = getConnection();

  const loadNotes = useCallback(() => {
    try {
      setNotes(getAllNotes());
    } catch {}
  }, []);

  useEffect(() => { loadNotes(); }, [loadNotes]);

  const handleSave = () => {
    if (!content.trim()) return;
    try {
      addNote(content.trim());
      setContent('');
      loadNotes();
    } catch {}
  };

  const handleDelete = (id: number) => {
    try {
      deleteNote(id);
      loadNotes();
    } catch {}
  };

  const handleSendToTerminal = (text: string) => {
    const activeTab = tabs[activeTabIndex];
    if (!activeTab) return;
    const tabId = activeTab.id;
    conn.send(
      `{"t":"term.input","tab":"${tabId}","data":"${safeJsonStr(text)}"}`
    );
    // Send Enter after a delay to avoid Claude Code TUI absorbing it
    setTimeout(() => {
      conn.send(
        `{"t":"term.input","tab":"${tabId}","data":"${safeJsonStr('\\r')}"}`
      );
    }, 150);
  };

  return (
    <View style={styles.container}>
      {/* Input area */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={content}
          onChangeText={setContent}
          placeholder="Write a note or command..."
          placeholderTextColor="#6B7280"
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />
        <Pressable
          style={[styles.saveButton, !content.trim() && styles.saveButtonDisabled]}
          onPress={handleSave}
        >
          <Text style={styles.saveButtonText}>Save</Text>
        </Pressable>
      </View>

      {/* Notes list */}
      {notes.length > 0 ? (
        <FlatList
          data={notes}
          keyExtractor={(n) => n.id.toString()}
          renderItem={({ item }) => (
            <View style={styles.noteRow}>
              <View style={styles.noteContent}>
                <Text style={styles.noteText} numberOfLines={4}>
                  {item.content}
                </Text>
                <Text style={styles.noteDate}>
                  {new Date(item.updatedAt).toLocaleString()}
                </Text>
              </View>
              <View style={styles.noteActions}>
                <Pressable
                  style={styles.noteSendButton}
                  onPress={() => handleSendToTerminal(item.content)}
                >
                  <Text style={styles.noteSendText}>Send</Text>
                </Pressable>
                <Pressable
                  style={styles.noteDeleteButton}
                  onPress={() => handleDelete(item.id)}
                >
                  <Text style={styles.noteDeleteText}>✕</Text>
                </Pressable>
              </View>
            </View>
          )}
          style={styles.list}
        />
      ) : (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>
            No notes yet.{'\n'}Save code snippets here and send them to the terminal.
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F0F10' },
  inputContainer: {
    padding: 12,
    backgroundColor: '#1A1A1C',
    borderBottomWidth: 1,
    borderBottomColor: '#252528',
  },
  input: {
    backgroundColor: '#0F0F10',
    color: '#E8E3DD',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    fontFamily: 'monospace',
    minHeight: 60,
    marginBottom: 8,
    textAlignVertical: 'top',
  },
  saveButton: {
    backgroundColor: '#D97757',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonDisabled: { opacity: 0.5 },
  saveButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  list: { flex: 1 },
  noteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#252528',
  },
  noteContent: { flex: 1, marginRight: 8 },
  noteText: {
    color: '#E8E3DD',
    fontFamily: 'monospace',
    fontSize: 13,
    lineHeight: 18,
  },
  noteDate: { color: '#3A3A3F', fontSize: 11, marginTop: 4 },
  noteActions: { flexDirection: 'row', gap: 6 },
  noteSendButton: {
    backgroundColor: '#22C55E',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  noteSendText: { color: '#FFFFFF', fontSize: 12, fontWeight: '600' },
  noteDeleteButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  noteDeleteText: { color: '#EF4444', fontSize: 14 },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyText: {
    color: '#6B7280',
    fontSize: 14,
    textAlign: 'center',
  },
});
