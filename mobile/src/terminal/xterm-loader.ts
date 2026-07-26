import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

// Load the pre-bundled terminal HTML (built by scripts/bundle-xterm.js)
// On devices, the bundled HTML is loaded via FileSystem from the app bundle.
// We use a hardcoded asset reference path.

let cachedUri: string | null = null;
let loadPromise: Promise<string> | null = null;

async function loadTerminalHtml(): Promise<string> {
  if (cachedUri) return cachedUri;

  // On Android, we load from the bundled assets.
  // The pre-bundled HTML is placed in assets/xterm/bundled/terminal.html
  const moduleId = require('../../assets/xterm/bundled/terminal.html');
  const asset = Asset.fromModule(moduleId);
  await asset.downloadAsync();
  cachedUri = asset.localUri ?? asset.uri;
  return cachedUri;
}

export function useTerminalHtml(): string | null {
  const [uri, setUri] = useState<string | null>(null);

  useEffect(() => {
    if (cachedUri) {
      setUri(cachedUri);
      return;
    }
    if (loadPromise) {
      loadPromise.then(setUri);
      return;
    }
    loadPromise = loadTerminalHtml();
    loadPromise.then(setUri);
  }, []);

  return uri;
}
