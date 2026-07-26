import { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useTerminalStore } from '../../src/state';
import { XtermView } from '../../src/terminal/xterm-view';
import { getConnection } from '../../src/connection';

const EXTRA_KEYS = [
  { label: 'esc', payload: '\x1b' },
  { label: 'ctrl', payload: '\x03' },
  { label: 'tab', payload: '\t' },
  { label: '~', payload: '~' },
  { label: '|', payload: '|' },
  { label: '/', payload: '/' },
  { label: '-', payload: '-' },
  { label: '←', payload: '\x1b[D' },
  { label: '↓', payload: '\x1b[B' },
  { label: '↑', payload: '\x1b[A' },
  { label: '→', payload: '\x1b[C' },
];

function safeJsonStr(s: string): string {
  return s
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');
}

export default function TerminalScreen() {
  const tabs = useTerminalStore((s) => s.tabs);
  const activeTabIndex = useTerminalStore((s) => s.activeTabIndex);
  const setActiveTabIndex = useTerminalStore((s) => s.setActiveTabIndex);
  const [showTabMenu, setShowTabMenu] = useState(false);

  const conn = getConnection();
  const cur = tabs[activeTabIndex];

  const handleInput = (data: string) => {
    if (cur) {
      conn.send(
        `{"t":"term.input","tab":"${cur.id}","data":"${safeJsonStr(data)}"}`
      );
    }
  };

  const handleResize = (cols: number, rows: number) => {
    if (cur) {
      conn.send(
        `{"t":"term.resize","tab":"${cur.id}","cols":${cols},"rows":${rows}}`
      );
    }
  };

  const openNewTab = () => {
    conn.send('{"t":"term.open"}');
    setShowTabMenu(false);
  };

  const closeTab = (tabId: string) => {
    conn.send(`{"t":"term.close","tab":"${tabId}"}`);
    if (cur?.id === tabId) {
      setActiveTabIndex(0);
    }
    setShowTabMenu(false);
  };

  if (tabs.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>
          No terminals open.{'\n'}Connect to a machine to open a terminal.
        </Text>
        <Pressable style={styles.openButton} onPress={openNewTab}>
          <Text style={styles.openButtonText}>Open Terminal</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Tab selector */}
      <View style={styles.tabBar}>
        <Pressable
          style={styles.tabSelector}
          onPress={() => setShowTabMenu(!showTabMenu)}
        >
          <View
            style={[
              styles.tabDot,
              {
                backgroundColor: cur?.alive !== false ? '#22C55E' : '#6B7280',
              },
            ]}
          />
          <Text style={styles.tabTitle} numberOfLines={1}>
            {cur ? `${cur.title}  ▾` : 'Terminal  ▾'}
          </Text>
        </Pressable>

        {showTabMenu && (
          <View style={styles.tabMenu}>
            {tabs.map((t, i) => (
              <Pressable
                key={t.id}
                style={styles.tabMenuItem}
                onPress={() => {
                  setActiveTabIndex(i);
                  setShowTabMenu(false);
                }}
              >
                <Text style={styles.tabMenuItemText} numberOfLines={1}>
                  {t.title}
                </Text>
                <Pressable onPress={() => closeTab(t.id)}>
                  <Text style={styles.closeButton}>✕</Text>
                </Pressable>
              </Pressable>
            ))}
            <Pressable style={styles.tabMenuItem} onPress={openNewTab}>
              <Text style={styles.tabMenuItemText}>+ New terminal</Text>
            </Pressable>
          </View>
        )}
      </View>

      {/* Terminal view */}
      {cur && (
        <View style={styles.terminalContainer}>
          <XtermView
            tabId={cur.id}
            raw={cur.raw}
            onInput={handleInput}
            onResize={handleResize}
          />
        </View>
      )}

      {/* Extra keys */}
      <ScrollView
        horizontal
        style={styles.extraKeys}
        showsHorizontalScrollIndicator={false}
      >
        {EXTRA_KEYS.map((key) => (
          <Pressable
            key={key.label}
            style={styles.extraKey}
            onPress={() => handleInput(key.payload)}
          >
            <Text style={styles.extraKeyText}>{key.label}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F0F10' },
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
    marginBottom: 16,
  },
  openButton: {
    backgroundColor: '#D97757',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  openButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  tabBar: {
    backgroundColor: '#1A1A1C',
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  tabSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#252528',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 24,
  },
  tabDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginRight: 8,
  },
  tabTitle: {
    color: '#E8E3DD',
    fontFamily: 'monospace',
    fontSize: 15,
    flex: 1,
  },
  tabMenu: {
    backgroundColor: '#1A1A1C',
    marginTop: 4,
    borderRadius: 8,
    paddingVertical: 4,
  },
  tabMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  tabMenuItemText: {
    color: '#E8E3DD',
    fontFamily: 'monospace',
    fontSize: 14,
    flex: 1,
  },
  closeButton: {
    color: '#EF4444',
    fontSize: 14,
    paddingHorizontal: 8,
  },
  terminalContainer: { flex: 1 },
  extraKeys: {
    backgroundColor: '#1A1A1C',
    paddingHorizontal: 6,
    paddingVertical: 4,
    maxHeight: 40,
  },
  extraKey: {
    backgroundColor: '#252528',
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginHorizontal: 2,
    borderRadius: 8,
  },
  extraKeyText: {
    color: '#B5B0AB',
    fontFamily: 'monospace',
    fontSize: 12,
  },
});
