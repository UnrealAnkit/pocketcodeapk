import 'react-native-gesture-handler';
import 'react-native-reanimated';

import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, Text, StyleSheet } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import * as Notifications from 'expo-notifications';
import { getDeviceId, setPersistedDeviceId } from '../src/connection/device-id';
import { loadMachines } from '../src/persistence/machines-store';
import { useMachinesStore } from '../src/state';
import { getConnection } from '../src/connection';
import { setApprovalHandler, ensureNotificationSetup } from '../src/notifications/notification-service';

const DEVICE_ID_KEY = 'pocketcode-device-id';

// Notification handler: show banners for local notifications in-app
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function RootLayout() {
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    initApp();
  }, []);

  async function initApp() {
    // Initialize device identifier
    const existingId = await SecureStore.getItemAsync(DEVICE_ID_KEY);
    if (existingId) {
      setPersistedDeviceId(existingId);
    } else {
      const newId = getDeviceId();
      SecureStore.setItemAsync(DEVICE_ID_KEY, newId).catch(() => {});
    }

    // Load persisted paired machines
    try {
      const machines = await loadMachines();
      useMachinesStore.getState().setMachines(machines);
    } catch {}

    // Setup notification categories and channels
    await ensureNotificationSetup();

    // Wire notification action responses to connection manager
    setApprovalHandler((tabId, action) => {
      const conn = getConnection();
      if (action === 'approve') {
        conn.respondToApproval(tabId, true);
      } else if (action === 'reject') {
        conn.respondToApproval(tabId, false);
      } else if (action === 'view_diff') {
        conn.send(`{"t":"git.diff","path":"","staged":false}`);
      }
    });

    // Biometric gate
    await checkBiometrics();
  }

  async function checkBiometrics() {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      if (!hasHardware || !isEnrolled) {
        // No biometrics available — allow direct access (match Kotlin behavior)
        setIsAuthorized(true);
        setAuthChecked(true);
        return;
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Unlock PocketCode',
        cancelLabel: 'Exit',
        disableDeviceFallback: false,
      });

      if (result.success) {
        setIsAuthorized(true);
      }
    } catch {
      // Allow access if authentication fails with an error
      setIsAuthorized(true);
    }
    setAuthChecked(true);
  }

  if (!authChecked) {
    return (
      <View style={styles.placeholder}>
        <StatusBar style="light" />
      </View>
    );
  }

  if (!isAuthorized) {
    return (
      <View style={styles.placeholder}>
        <Text style={styles.placeholderText}>Authentication Required</Text>
        <StatusBar style="light" />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
      </Stack>
    </>
  );
}

const styles = StyleSheet.create({
  placeholder: {
    flex: 1,
    backgroundColor: '#0F0F10',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    color: '#E8E3DD',
    fontSize: 16,
  },
});
