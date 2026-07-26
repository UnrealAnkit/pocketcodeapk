const uuidLib = {
  generate(): string {
    // Simple RFC 4122 v4 UUID generator
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  },
};

let cachedDeviceId: string | null = null;
let cachedAndroidId: string | null = null;

export function getDeviceId(): string {
  if (!cachedDeviceId) {
    cachedDeviceId = uuidLib.generate();
  }
  return cachedDeviceId;
}

export function setPersistedDeviceId(id: string): void {
  cachedDeviceId = id;
}

export function getAndroidFingerprint(): string {
  if (!cachedAndroidId) {
    cachedAndroidId = uuidLib.generate();
  }
  return cachedAndroidId;
}

export function setPersistedAndroidFingerprint(id: string): void {
  cachedAndroidId = id;
}
