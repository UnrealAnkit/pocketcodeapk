import { create } from 'zustand';
import { PairedMachine } from './types';

interface MachinesState {
  machines: PairedMachine[];
  setMachines: (machines: PairedMachine[]) => void;
  addMachine: (machine: PairedMachine) => void;
  removeMachine: (id: string) => void;
  updateToken: (id: string, token: string) => void;
  getById: (id: string) => PairedMachine | undefined;
}

export const useMachinesStore = create<MachinesState>((set, get) => ({
  machines: [],
  setMachines: (machines) => set({ machines }),
  addMachine: (machine) =>
    set((state) => ({ machines: [...state.machines, machine] })),
  removeMachine: (id) =>
    set((state) => ({ machines: state.machines.filter((m) => m.id !== id) })),
  updateToken: (id, token) =>
    set((state) => ({
      machines: state.machines.map((m) => (m.id === id ? { ...m, token } : m)),
    })),
  getById: (id) => get().machines.find((m) => m.id === id),
}));
