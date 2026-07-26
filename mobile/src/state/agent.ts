import { create } from 'zustand';

export interface AgentEvent {
  ts: number;
  kind: string;
  summary: string;
  tab: string;
  agentId: string;
}

export type LiveAgentState =
  | { type: 'running' }
  | { type: 'waiting'; snippet: string }
  | { type: 'finished'; code: number };

interface AgentState {
  events: AgentEvent[];
  liveStates: Record<string, LiveAgentState>;
  addEvent: (event: AgentEvent) => void;
  applyLiveState: (tabId: string, state: LiveAgentState) => void;
  clearAll: () => void;
}

export const useAgentStore = create<AgentState>((set) => ({
  events: [],
  liveStates: {},
  addEvent: (event) =>
    set((state) => ({ events: [...state.events, event] })),
  applyLiveState: (tabId, next) =>
    set((state) => {
      const prev = state.liveStates[tabId];
      const effective = prev && prev.type === 'waiting' && next.type === 'running' ? prev : next;
      if (
        prev &&
        prev.type === effective.type &&
        (effective.type === 'running' || effective.type === 'waiting'
          ? JSON.stringify(prev) === JSON.stringify(effective)
          : true)
      ) {
        return state;
      }
      return {
        liveStates: { ...state.liveStates, [tabId]: effective },
      };
    }),
  clearAll: () => set({ events: [], liveStates: {} }),
}));

export function liveStateSummary(states: Record<string, LiveAgentState>): string {
  const entries = Object.values(states);
  const waiting = entries.filter((s) => s.type === 'waiting').length;
  const running = entries.filter((s) => s.type === 'running').length;
  const finished = entries.filter((s) => s.type === 'finished').length;
  return [
    waiting > 0 ? `${waiting} waiting` : '',
    running > 0 ? `${running} running` : '',
    finished > 0 ? `${finished} done` : '',
  ]
    .filter(Boolean)
    .join(' · ');
}
