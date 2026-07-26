// Wire protocol shared between extension and mobile.
// Keep this file in sync with extension/src/server/protocol.ts.

export type SessionId = string;
export type TabId = string;
export type DeviceId = string;

export type AgentEventType = 'message' | 'tool_call' | 'question' | 'diff';
export interface StructuredAgentEvent {
  type: AgentEventType;
  content: string;
  agentId: 'claude-code' | 'codex-cli';
  timestamp: number;
}

export interface PairingQR {
  v: 1;
  url: string;
  token: string;
  fp: string;
  exp: number;
}

export type WsMsg =
  | { t: 'term.open'; tab?: string; cols?: number; rows?: number; cwd?: string }
  | { t: 'term.input'; tab: string; data: string }
  | { t: 'term.resize'; tab: string; cols: number; rows: number }
  | { t: 'term.close'; tab: string }
  | { t: 'term.data'; tab: string; data: string }
  | { t: 'term.exit'; tab: string; code: number }
  | { t: 'term.list'; tabs: Array<{ id: string; title: string; alive: boolean }> }
  | { t: 'term.replay'; tab: string; data: string }

  | { t: 'fs.tree'; path?: string; depth?: number }
  | { t: 'fs.read'; path: string }
  | { t: 'fs.write'; path: string; content: string }
  | { t: 'fs.mkdir'; path: string }
  | { t: 'fs.rename'; from: string; to: string }
  | { t: 'fs.delete'; path: string; recursive?: boolean }
  | { t: 'fs.search'; query: string; regex?: boolean; max?: number }

  | { t: 'git.status' }
  | { t: 'git.diff'; path?: string; staged?: boolean }
  | { t: 'git.stage'; paths: string[] }
  | { t: 'git.unstage'; paths: string[] }
  | { t: 'git.commit'; message: string; amend?: boolean }
  | { t: 'git.push'; remote?: string; branch?: string }
  | { t: 'git.pull'; remote?: string; branch?: string }
  | { t: 'git.branches' }
  | { t: 'git.checkout'; name: string; create?: boolean }
  | { t: 'git.log'; max?: number }
  | { t: 'github.prs' }
  | { t: 'github.pr'; number: number }
  | { t: 'github.pr.merge'; number: number; method?: 'merge' | 'squash' | 'rebase' }
  | { t: 'github.pr.close'; number: number }
  | { t: 'git.result'; action: 'stage' | 'unstage' | 'commit' | 'push' | 'pull' | 'checkout'; current?: string | null; files: Array<unknown> }

  | { t: 'devservers'; list?: Array<unknown> }
  | { t: 'devserver.start'; cmd: string; cwd?: string }
  | { t: 'devserver.stop'; pid: number }
  | { t: 'devserver.log'; port: number; follow?: boolean; data?: string }

  | { t: 'workspace.list'; list?: Array<{ name: string; uri: string }> }
  | { t: 'workspace.switch'; folderUri: string }

  | { t: 'snapshot.create'; label?: string }
  | { t: 'snapshot.list' }
  | { t: 'snapshot.revert'; id: string }

  | { t: 'agent.approve'; session: string }
  | { t: 'agent.reject'; session: string }
  | { t: 'agent.event'; tab: string; event?: StructuredAgentEvent; kind?: string; payload?: unknown }

  | { t: 'token.refresh'; token: string; exp: number }

  | { t: 'pong' }
  | { t: 'error'; msg: string; trace?: string };
