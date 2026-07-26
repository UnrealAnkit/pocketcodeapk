import { create } from 'zustand';

export interface FsNode {
  name: string;
  path: string;
  type: string;
  size: number;
  children: FsNode[];
}

interface FileState {
  fileTree: FsNode[];
  openFile: { path: string; content: string } | null;
  setFileTree: (nodes: FsNode[]) => void;
  setOpenFile: (file: { path: string; content: string } | null) => void;
}

export const useFileStore = create<FileState>((set) => ({
  fileTree: [],
  openFile: null,
  setFileTree: (fileTree) => set({ fileTree }),
  setOpenFile: (openFile) => set({ openFile }),
}));
