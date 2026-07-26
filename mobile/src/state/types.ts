export type ConnState =
  | { type: 'idle' }
  | { type: 'connecting'; machine: string }
  | { type: 'reconnecting'; machine: string; attempt: number }
  | { type: 'connected'; machine: string }
  | { type: 'error'; reason: string }
  | { type: 'disconnected' };

export interface PairedMachine {
  id: string;
  name: string;
  url: string;
  token: string;
  fingerprint: string;
  pairedAtMs: number;
}
