/**
 * Expo config plugin that adds ForegroundService to AndroidManifest.xml.
 * Required for keeping WebSocket alive when the app is backgrounded.
 *
 * Usage: Add to app.json plugins array:
 *   ["../../native/ForegroundService/withForegroundService"]
 */
const { withAndroidManifest } = require('@expo/config-plugins');

function withForegroundService(config) {
  return withAndroidManifest(config, (configProps) => {
    const androidManifest = configProps.modResults.manifest;

    // Find or create <application>
    const app = androidManifest.application[0];

    // Add foreground service element
    if (!app.service) app.service = [];

    const exists = app.service.some(
      (s) => s.$?.['android:name'] === '.service.SessionForegroundService'
    );

    if (!exists) {
      app.service.push({
        $: {
          'android:name': '.service.SessionForegroundService',
          'android:foregroundServiceType': 'dataSync',
          'android:exported': 'false',
        },
      });
    }

    return configProps;
  });
}

module.exports = withForegroundService;
