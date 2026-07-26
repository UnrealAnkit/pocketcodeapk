import * as SecureStore from 'expo-secure-store';
import type { PairedMachine } from '../state/types';

const MACHINES_KEY = 'pocketcode-machines';

export async function loadMachines(): Promise<PairedMachine[]> {
  try {
    const raw = await SecureStore.getItemAsync(MACHINES_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export async function saveMachines(machines: PairedMachine[]): Promise<void> {
  try {
    await SecureStore.setItemAsync(MACHINES_KEY, JSON.stringify(machines));
  } catch (err) {
    console.error('[PocketCode] Failed to save machines:', err);
  }
}
