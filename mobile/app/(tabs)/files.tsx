import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useFileStore } from '../../src/state';
import { getConnection } from '../../src/connection';
import type { FsNode } from '../../src/state';

function NodeRow({
  node,
  depth,
  onOpen,
}: {
  node: FsNode;
  depth: number;
  onOpen: (n: FsNode) => void;
}) {
  const isDir = node.type === 'dir';
  const hasChildren = isDir && Array.isArray(node.children) && node.children.length > 0;
  const [open, setOpen] = useState(false);

  return (
    <>
      <Pressable
        style={[styles.row, { paddingLeft: depth * 16 + 8 }]}
        onPress={() => {
          if (isDir) {
            setOpen(!open);
          } else {
            onOpen(node);
          }
        }}
      >
        <Text style={styles.icon}>
          {isDir ? (open ? '📂' : '📁') : '📄'}
        </Text>
        <Text style={styles.name} numberOfLines={1}>
          {node.name}
        </Text>
        {node.type === 'file' && (
          <Text style={styles.size}>{node.size} B</Text>
        )}
      </Pressable>
      {open && hasChildren && (
        <>
          {node.children.map((child) => (
            <NodeRow
              key={child.path}
              node={child}
              depth={depth + 1}
              onOpen={onOpen}
            />
          ))}
        </>
      )}
    </>
  );
}

export default function FilesScreen() {
  const fileTree = useFileStore((s) => s.fileTree);
  const conn = getConnection();

  const handleOpenFile = (node: FsNode) => {
    if (node.type === 'file') {
      const escaped = node.path.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
      conn.send(`{"t":"fs.read","path":"${escaped}"}`);
    }
  };

  if (fileTree.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>
          No files loaded.{'\n'}Connect to a machine to browse files.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {fileTree.map((node) => (
        <NodeRow
          key={node.path}
          node={node}
          depth={0}
          onOpen={handleOpenFile}
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F0F10' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingRight: 8,
  },
  icon: { fontSize: 16, marginRight: 8, width: 24, textAlign: 'center' },
  name: { flex: 1, color: '#E8E3DD', fontSize: 14 },
  size: { color: '#6B7280', fontSize: 12, marginLeft: 8 },
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
});
