import React, { useRef, useCallback, useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Text as RNText } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { useTerminalHtml } from './xterm-loader';

function b64(text: string): string {
  // In React Native, btoa is not available. Use a simple base64 encoder.
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const bytes = new TextEncoder().encode(text);
  let result = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const b1 = bytes[i];
    const b2 = i + 1 < bytes.length ? bytes[i + 1] : 0;
    const b3 = i + 2 < bytes.length ? bytes[i + 2] : 0;
    result += chars[b1 >> 2];
    result += chars[((b1 & 3) << 4) | (b2 >> 4)];
    result += i + 1 < bytes.length ? chars[((b2 & 15) << 2) | (b3 >> 6)] : '=';
    result += i + 2 < bytes.length ? chars[b3 & 63] : '=';
  }
  return result;
}

function shiftedAppendDelta(previous: string, next: string): string | null {
  if (previous.length !== next.length || previous.length === 0) return null;
  const probeLength = Math.min(64, next.length);
  const probe = next.substring(0, probeLength);
  let start = previous.indexOf(probe);
  while (start >= 0) {
    const overlapLength = previous.length - start;
    if (previous.endsWith(next.substring(0, overlapLength))) {
      return next.substring(overlapLength);
    }
    start = previous.indexOf(probe, start + 1);
  }
  return null;
}

interface XtermViewProps {
  tabId: string;
  raw: string;
  onInput: (data: string) => void;
  onResize: (cols: number, rows: number) => void;
}

const RENDER_BATCH_DELAY_MS = 16;

export function XtermView({ tabId, raw, onInput, onResize }: XtermViewProps) {
  const htmlUri = useTerminalHtml();
  const webViewRef = useRef<WebView>(null);
  const stateRef = useRef({
    tabId: null as string | null,
    lastRaw: '',
    pageReady: false,
  });
  const renderQueueRef = useRef<(() => void) | null>(null);
  const renderTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Flush pending render
  const flushRender = useCallback(() => {
    const fn = renderQueueRef.current;
    renderQueueRef.current = null;
    fn?.();
  }, []);

  // Schedule a batched render
  const scheduleRender = useCallback((data: { tabId: string; raw: string }) => {
    renderQueueRef.current = () => {
      const state = stateRef.current;
      const webView = webViewRef.current;
      if (!webView || !state.pageReady) return;

      const nextTabId = data.tabId;
      const nextRaw = data.raw;

      if (state.tabId !== nextTabId) {
        // Tab switch — reset terminal
        state.tabId = nextTabId;
        state.lastRaw = nextRaw;
        webView.injectJavaScript(
          `window.resetAndWrite('${b64(nextRaw)}'); true;`
        );
      } else if (nextRaw === state.lastRaw) {
        // No change
      } else if (nextRaw.startsWith(state.lastRaw)) {
        // Append delta
        const delta = nextRaw.substring(state.lastRaw.length);
        state.lastRaw = nextRaw;
        if (delta) {
          webView.injectJavaScript(
            `window.writeChunk('${b64(delta)}'); true;`
          );
        }
      } else {
        // Buffer rotation check
        const delta = shiftedAppendDelta(state.lastRaw, nextRaw);
        if (delta) {
          state.lastRaw = nextRaw;
          webView.injectJavaScript(
            `window.writeChunk('${b64(delta)}'); true;`
          );
        } else {
          // Full reset
          state.lastRaw = nextRaw;
          webView.injectJavaScript(
            `window.resetAndWrite('${b64(nextRaw)}'); true;`
          );
        }
      }
    };

    if (renderTimerRef.current) clearTimeout(renderTimerRef.current);
    renderTimerRef.current = setTimeout(flushRender, RENDER_BATCH_DELAY_MS);
  }, [flushRender]);

  // Update when raw or tabId changes
  useEffect(() => {
    scheduleRender({ tabId, raw });
  }, [tabId, raw, scheduleRender]);

  // Handle messages from the terminal WebView
  const handleMessage = useCallback(
    (event: WebViewMessageEvent) => {
      try {
        const msg = JSON.parse(event.nativeEvent.data);
        if (msg.type === 'input') {
          onInput(msg.data);
        } else if (msg.type === 'resize') {
          onResize(msg.cols, msg.rows);
        } else if (msg.type === 'ready') {
          stateRef.current.pageReady = true;
          // Replay current state after page loads
          scheduleRender({ tabId, raw });
        }
      } catch {}
    },
    [onInput, onResize, tabId, raw, scheduleRender]
  );

  if (!htmlUri) {
    return (
      <View style={styles.loading}>
        <RNText style={styles.loadingText}>Loading terminal…</RNText>
      </View>
    );
  }

  return (
    <WebView
      ref={webViewRef}
      source={{ uri: htmlUri }}
      style={styles.webview}
      javaScriptEnabled={true}
      domStorageEnabled={true}
      originWhitelist={['*']}
      onMessage={handleMessage}
      scrollEnabled={false}
      allowsInlineMediaPlayback={true}
    />
  );
}

const styles = StyleSheet.create({
  webview: {
    flex: 1,
    backgroundColor: '#0F0F10',
  },
  loading: {
    flex: 1,
    backgroundColor: '#0F0F10',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#6B7280',
    fontSize: 14,
  },
});
