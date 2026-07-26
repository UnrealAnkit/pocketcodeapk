import { create } from 'zustand';

export interface Tab {
  id: string;
  title: string;
  alive: boolean;
  raw: string;
}

export const RAW_BUFFER_CAP = 200_000;

interface TerminalState {
  tabs: Tab[];
  activeTabIndex: number;
  setTabs: (tabs: Tab[]) => void;
  updateTab: (tabId: string, updater: (tab: Tab) => Tab) => void;
  setActiveTabIndex: (index: number) => void;
}

export const useTerminalStore = create<TerminalState>((set) => ({
  tabs: [],
  activeTabIndex: 0,
  setTabs: (tabs) => set({ tabs }),
  updateTab: (tabId, updater) =>
    set((state) => ({
      tabs: state.tabs.map((t) => (t.id === tabId ? updater(t) : t)),
    })),
  setActiveTabIndex: (activeTabIndex) => set({ activeTabIndex }),
}));
