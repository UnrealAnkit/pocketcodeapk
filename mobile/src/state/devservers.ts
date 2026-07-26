import { create } from 'zustand';

interface DevServer {
  pid: number;
  cmd: string;
  port: number | null;
  managed: boolean;
}

interface DevServerState {
  servers: DevServer[];
  logs: Record<number, string>;
  setServers: (servers: DevServer[]) => void;
  appendLog: (port: number, data: string) => void;
}

export const useDevServerStore = create<DevServerState>((set) => ({
  servers: [],
  logs: {},
  setServers: (servers) => set({ servers }),
  appendLog: (port, data) =>
    set((state) => ({
      logs: {
        ...state.logs,
        [port]: ((state.logs[port] ?? '') + data).slice(-16_000),
      },
    })),
}));
