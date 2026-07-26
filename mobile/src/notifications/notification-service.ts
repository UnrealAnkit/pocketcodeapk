import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import type { LiveAgentState } from '../state';

const AGENT_APPROVAL_CATEGORY = 'agent_approval';

/**
 * Configure notification categories and channels.
 * Must be called before scheduling any notifications.
 */
export async function ensureNotificationSetup(): Promise<void> {
  // Android notification channels
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('agent_events', {
      name: 'Agent events',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
    await Notifications.setNotificationChannelAsync('agent_live', {
      name: 'Agent live status',
      importance: Notifications.AndroidImportance.LOW,
      description: 'Ongoing per-session agent status (running / finished)',
      showBadge: false,
    });
    await Notifications.setNotificationChannelAsync('agent_waiting', {
      name: 'Agent needs approval',
      importance: Notifications.AndroidImportance.HIGH,
      description: 'Heads-up when an agent is waiting for Approve / Reject',
    });
  }

  // Interactive category with action buttons
  await Notifications.setNotificationCategoryAsync(AGENT_APPROVAL_CATEGORY, [
    {
      identifier: 'approve',
      buttonTitle: '✓ Approve',
      options: { opensAppToForeground: false },
    },
    {
      identifier: 'reject',
      buttonTitle: '✕ Reject',
      options: { opensAppToForeground: false },
    },
    {
      identifier: 'view_diff',
      buttonTitle: 'View diff',
      options: { opensAppToForeground: true },
    },
  ]);
}

type ApprovalHandler = (tabId: string, action: 'approve' | 'reject' | 'view_diff') => void;

let approvalHandler: ApprovalHandler | null = null;

export function setApprovalHandler(handler: ApprovalHandler): void {
  approvalHandler = handler;
}

// Listen for notification responses globally
Notifications.addNotificationResponseReceivedListener((response) => {
  const { actionIdentifier } = response;
  const data = response.notification.request.content.data as Record<string, unknown> | undefined;
  const session = (data?.session as string) ?? '';

  if (actionIdentifier === 'approve') {
    approvalHandler?.(session, 'approve');
  } else if (actionIdentifier === 'reject') {
    approvalHandler?.(session, 'reject');
  } else if (actionIdentifier === 'view_diff') {
    approvalHandler?.(session, 'view_diff');
  }
});

function shortTab(tabId: string): string {
  return tabId.length <= 8 ? tabId : tabId.slice(0, 8);
}

/**
 * Update (or create) a per-tab live notification. Same tabId re-uses the same
 * Android notification, so the card updates in place instead of stacking.
 */
export async function updateLiveNotification(
  tabId: string,
  state: LiveAgentState,
  tabTitle?: string | null,
): Promise<void> {
  const label = tabTitle && tabTitle.trim() ? tabTitle : shortTab(tabId);
  const id = tabId.split('').reduce((h, c) => ((h << 5) - h + c.charCodeAt(0)) | 0, 0);

  if (state.type === 'waiting') {
    const body = state.snippet || 'Agent is waiting for your decision';
    await Notifications.scheduleNotificationAsync({
      identifier: `live-${tabId}`,
      content: {
        title: `⏸ Waiting · ${label}`,
        body,
        categoryIdentifier: AGENT_APPROVAL_CATEGORY,
        data: { session: tabId, type: 'waiting' },
        sticky: true,
        ...(Platform.OS === 'android' ? { channelId: 'agent_waiting' } : {}),
      },
      trigger: null,
    });
  } else if (state.type === 'running') {
    await Notifications.scheduleNotificationAsync({
      identifier: `live-${tabId}`,
      content: {
        title: `▶ Running · ${label}`,
        body: 'Agent is working…',
        data: { session: tabId, type: 'running' },
        sticky: true,
        ...(Platform.OS === 'android' ? { channelId: 'agent_live' } : {}),
      },
      trigger: null,
    });
  } else if (state.type === 'finished') {
    const ok = state.code === 0;
    await Notifications.scheduleNotificationAsync({
      identifier: `live-${tabId}`,
      content: {
        title: ok ? `✓ Finished · ${label}` : `✕ Failed · ${label}`,
        body: `Exited with code ${state.code}`,
        data: { session: tabId, type: 'finished' },
        autoDismiss: true,
        ...(Platform.OS === 'android' ? { channelId: 'agent_live' } : {}),
      },
      trigger: null,
    });
  }
}

export async function clearLiveNotification(tabId: string): Promise<void> {
  await Notifications.dismissNotificationAsync(`live-${tabId}`);
}

export async function clearAllLiveNotifications(): Promise<void> {
  await Notifications.dismissAllNotificationsAsync();
}
