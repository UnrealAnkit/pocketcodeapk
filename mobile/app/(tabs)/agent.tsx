import { View, Text, StyleSheet, FlatList, Pressable } from 'react-native';
import { useAgentStore } from '../../src/state';
import { getConnection } from '../../src/connection';
import type { AgentEvent } from '../../src/state';

const kindGlyph: Record<string, string> = {
  file_changed: '✎',
  cmd: '$',
  tests: '✓',
  tool: '⚙',
  awaiting_approval: '⏸',
};
const kindColor: Record<string, string> = {
  file_changed: '#3B82F6',
  cmd: '#EAB308',
  tests: '#22C55E',
  tool: '#A855F7',
  awaiting_approval: '#EF4444',
};

export default function AgentScreen() {
  const events = useAgentStore((s) => s.events);
  const conn = getConnection();

  const handleApprove = (tab: string) => conn.respondToApproval(tab, true);
  const handleReject = (tab: string) => conn.respondToApproval(tab, false);

  if (events.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>
          No agent activity yet.{'\n'}Start a Claude Code session in the terminal.
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={[...events].reverse()}
      keyExtractor={(item, index) => `${item.ts}-${item.kind}-${item.summary.length}-${index}`}
      renderItem={({ item }) => (
        <EventRow
          event={item}
          onApprove={handleApprove}
          onReject={handleReject}
        />
      )}
      style={styles.container}
      contentContainerStyle={styles.content}
    />
  );
}

function EventRow({
  event,
  onApprove,
  onReject,
}: {
  event: AgentEvent;
  onApprove: (tab: string) => void;
  onReject: (tab: string) => void;
}) {
  const glyph = kindGlyph[event.kind] ?? '·';
  const color = kindColor[event.kind] ?? '#6B7280';

  return (
    <View style={styles.eventRow}>
      <Text style={[styles.glyph, { color }]}>{glyph}</Text>
      <View style={styles.eventBody}>
        <Text style={[styles.kind, { color }]}>
          {event.kind.replace(/_/g, ' ')}
        </Text>
        <Text style={styles.summary} numberOfLines={3}>
          {event.summary}
        </Text>
        {event.kind === 'awaiting_approval' && (
          <View style={styles.approvalActions}>
            <Pressable
              style={styles.approveButton}
              onPress={() => onApprove(event.tab)}
            >
              <Text style={styles.approveText}>Approve</Text>
            </Pressable>
            <Pressable
              style={styles.rejectButton}
              onPress={() => onReject(event.tab)}
            >
              <Text style={styles.rejectText}>Reject</Text>
            </Pressable>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F0F10' },
  content: { paddingHorizontal: 12, paddingVertical: 8 },
  empty: {
    flex: 1,
    backgroundColor: '#0F0F10',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyText: {
    color: '#6B7280',
    fontSize: 14,
    textAlign: 'center',
  },
  eventRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#252528',
  },
  glyph: { fontSize: 14, width: 24, paddingTop: 2 },
  eventBody: { flex: 1 },
  kind: { fontSize: 11, fontWeight: '600', marginBottom: 2 },
  summary: {
    color: '#E8E3DD',
    fontFamily: 'monospace',
    fontSize: 13,
    lineHeight: 18,
  },
  approvalActions: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 8,
  },
  approveButton: {
    backgroundColor: '#22C55E',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  approveText: { color: '#FFFFFF', fontSize: 12, fontWeight: '600' },
  rejectButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#EF4444',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  rejectText: { color: '#EF4444', fontSize: 12, fontWeight: '600' },
});
