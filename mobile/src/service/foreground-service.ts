import { requireNativeModule } from 'expo';

const ForegroundServiceNative = requireNativeModule('ForegroundService');

export const ForegroundService = {
  start(text: string): void {
    ForegroundServiceNative.start(text);
  },
  update(text: string): void {
    ForegroundServiceNative.update(text);
  },
  stop(): void {
    ForegroundServiceNative.stop();
  },
};
