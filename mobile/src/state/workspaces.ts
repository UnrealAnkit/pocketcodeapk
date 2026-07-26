import { create } from 'zustand';

interface WorkspaceState {
  workspaces: Array<{ name: string; uri: string }>;
  setWorkspaces: (workspaces: Array<{ name: string; uri: string }>) => void;
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  workspaces: [],
  setWorkspaces: (workspaces) => set({ workspaces }),
}));
