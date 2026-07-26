import { create } from 'zustand';
import { ConnState } from './types';

interface ConnectionState {
  state: ConnState;
  lastConnectUrl: string | null;
  costUsd: number | null;
  setState: (state: ConnState) => void;
  setLastConnectUrl: (url: string | null) => void;
  setCostUsd: (usd: number | null) => void;
}

export const useConnectionStore = create<ConnectionState>((set) => ({
  state: { type: 'idle' },
  lastConnectUrl: null,
  costUsd: null,
  setState: (state) => set({ state }),
  setLastConnectUrl: (lastConnectUrl) => set({ lastConnectUrl }),
  setCostUsd: (costUsd) => set({ costUsd }),
}));
