import { Tabs } from 'expo-router';
import { useConnectionStore } from '../../src/state';

export default function TabLayout() {
  const connState = useConnectionStore((s) => s.state);
  const costUsd = useConnectionStore((s) => s.costUsd);

  const machine =
    connState.type === 'connected'
      ? connState.machine
      : connState.type === 'connecting' || connState.type === 'reconnecting'
        ? connState.machine
        : undefined;

  const headerTitle = machine ?? 'PocketCode';
  const costSuffix = costUsd != null ? ` · ~$${costUsd.toFixed(4)}` : '';

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: '#0F0F10' },
        headerTintColor: '#E8E3DD',
        tabBarStyle: {
          backgroundColor: '#1A1A1C',
          borderTopColor: '#252528',
          borderTopWidth: 1,
        },
        tabBarActiveTintColor: '#D97757',
        tabBarInactiveTintColor: '#6B7280',
      }}
    >
      <Tabs.Screen
        name="files"
        options={{
          tabBarLabel: 'Files',
          title: headerTitle + costSuffix,
        }}
      />
      <Tabs.Screen
        name="terminal"
        options={{
          tabBarLabel: 'Terminal',
          title: headerTitle + costSuffix,
        }}
      />
      <Tabs.Screen
        name="git"
        options={{
          tabBarLabel: 'Git',
          title: headerTitle + costSuffix,
        }}
      />
      <Tabs.Screen
        name="agent"
        options={{
          tabBarLabel: 'Agent',
          title: headerTitle + costSuffix,
        }}
      />
      <Tabs.Screen
        name="notes"
        options={{
          tabBarLabel: 'Notes',
          title: headerTitle + costSuffix,
        }}
      />
      <Tabs.Screen
        name="pairing"
        options={{
          tabBarLabel: 'Pair',
          title: headerTitle + costSuffix,
        }}
      />
    </Tabs>
  );
}
