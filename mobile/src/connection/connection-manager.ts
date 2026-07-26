import {
  useConnectionStore,
  useTerminalStore,
  useAgentStore,
  useFileStore,
  useGitStore,
  useDevServerStore,
  useWorkspaceStore,
  useMachinesStore,
  RAW_BUFFER_CAP,
  type PairedMachine,
  type AgentEvent,
  type Tab,
} from '../state';
import { AgentEventParser } from '../agent/event-parser';
import { updateLiveNotification, clearLiveNotification, clearAllLiveNotifications } from '../notifications/notification-service';
import { addEvent as persistEvent } from '../persistence/database';
import { ForegroundService } from '../service/foreground-service';

const RECONNECT_BACKOFF_MS = [1_000, 2_000, 4_000, 8_000, 16_000];

export class ConnectionManager {
  private ws: WebSocket | null = null;
  private userDisconnected = false;
  private lastMachine: PairedMachine | null = null;
  private reconnectAttempt = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private pingInterval: ReturnType<typeof setInterval> | null = null;
  private agentParser = new AgentEventParser();

  // Accumulators for features that run on the term.data stream
  private costState = { input: 0, output: 0 };

  connect(machine: PairedMachine): void {
    this.userDisconnected = false;
    this.lastMachine = machine;
    this.reconnectAttempt = 0;
    this.cancelReconnect();
    ForegroundService.start(`Connected to ${machine.name}`);
    this.openWebSocket(machine, 0);
  }

  disconnect(): void {
    this.userDisconnected = true;
    this.cancelReconnect();
    this.stopPing();
    if (this.ws) {
      this.ws.close(1000, 'user');
      this.ws = null;
    }
    useConnectionStore.getState().setState({ type: 'idle' });
    // Drop live agent cards so a later session doesn't inherit stale states
    useAgentStore.getState().clearAll();
    clearAllLiveNotifications();
    ForegroundService.stop();
  }

  send(jsonMsg: string): void {
    const state = useConnectionStore.getState().state;
    if (state.type === 'connected' && this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(jsonMsg);
    }
  }

  respondToApproval(tabId: string, approve: boolean): void {
    const action = approve ? 'agent.approve' : 'agent.reject';
    this.send(`{"t":"${action}","session":"${tabId}"}`);
    useAgentStore.getState().applyLiveState(tabId, { type: 'running' });
    const title = useTerminalStore.getState().tabs.find((t) => t.id === tabId)?.title;
    updateLiveNotification(tabId, { type: 'running' }, title);
  }

  private buildWsUrl(machine: PairedMachine): string {
    const base = machine.url.trim();
    if (base.includes('token=')) return base;
    if (!machine.token) return base;

    const separator = base.includes('?') ? '&' : '?';
    const truncated = `${base}${separator}token=${machine.token}`;
    return truncated;
  }

  private openWebSocket(machine: PairedMachine, attempt: number): void {
    const connStore = useConnectionStore.getState();

    if (attempt > 0) {
      connStore.setState({ type: 'reconnecting', machine: machine.name, attempt });
    } else {
      connStore.setState({ type: 'connecting', machine: machine.name });
    }

    const wsUrl = this.buildWsUrl(machine);
    const sanitizedUrl = wsUrl.replace(/token=[^&]+/, 'token=…');
    connStore.setLastConnectUrl(sanitizedUrl);

    // Validate: reject obviously bad URLs
    if (machine.url.includes('PairedMachine(') || !(wsUrl.startsWith('ws://') || wsUrl.startsWith('wss://'))) {
      connStore.setState({ type: 'error', reason: 'Invalid pairing URL — scan a fresh QR code' });
      return;
    }

    try {
      const socket = new WebSocket(wsUrl);

      socket.onopen = () => {
        this.ws = socket;
        connStore.setState({ type: 'connected', machine: machine.name });
        ForegroundService.update(`Connected to ${machine.name}`);

        // Bootstrap: request initial state from server
        this.send('{"t":"fs.tree"}');
        this.send('{"t":"git.status"}');
        this.send('{"t":"term.list"}');
        this.send('{"t":"devservers"}');
        this.send('{"t":"workspace.list"}');

        this.startPing();
      };

      socket.onmessage = (event) => {
        this.handleMessage(event.data);
      };

      socket.onerror = () => {
        // onclose will fire after this
      };

      socket.onclose = (event) => {
        this.ws = null;
        this.stopPing();

        if (this.userDisconnected) {
          connStore.setState({ type: 'idle' });
          return;
        }

        if (event.code === 1000) {
          connStore.setState({ type: 'disconnected' });
          this.scheduleReconnect(machine, attempt);
          return;
        }

        connStore.setState({ type: 'error', reason: `Connection closed (code ${event.code})` });
        this.scheduleReconnect(machine, attempt);
      };
    } catch (err) {
      connStore.setState({
        type: 'error',
        reason: err instanceof Error ? err.message : 'connection failed',
      });
      this.scheduleReconnect(machine, attempt);
    }
  }

  private handleMessage(text: string): void {
    let msg: Record<string, any>;
    try {
      msg = JSON.parse(text);
    } catch {
      return;
    }

    const type = msg.t;
    if (!type) return;

    switch (type) {
      case 'fs.tree': {
        const nodes = Array.isArray(msg.nodes) ? msg.nodes : [];
        useFileStore.getState().setFileTree(nodes);
        break;
      }
      case 'fs.read': {
        useFileStore.getState().setOpenFile({
          path: msg.path ?? '',
          content: msg.content ?? '',
        });
        break;
      }
      case 'git.status': {
        useGitStore.getState().setStatus({
          current: msg.current ?? null,
          files: Array.isArray(msg.files) ? msg.files : [],
        });
        break;
      }
      case 'git.result': {
        const action = msg.action ?? '';
        const current = msg.current ?? null;
        const files = Array.isArray(msg.files) ? msg.files : [];
        useGitStore.getState().setStatus({ current, files });
        const feedback = this.gitFeedback(action, current, files.length);
        useGitStore.getState().setFeedback(feedback);
        break;
      }
      case 'git.diff': {
        useGitStore.getState().setDiffText(msg.text ?? '');
        break;
      }
      case 'git.branches': {
        const branches = Array.isArray(msg.all)
          ? msg.all.filter((b: any) => typeof b === 'string')
          : [];
        useGitStore.getState().setBranches(branches);
        break;
      }
      case 'github.prs': {
        const prs = Array.isArray(msg.prs) ? msg.prs : [];
        useGitStore.getState().setPullRequests(prs);
        break;
      }
      case 'github.pr': {
        if (msg.pr) {
          useGitStore.getState().setPullRequestDetail(msg.pr);
        }
        break;
      }
      case 'github.result': {
        const number = msg.number ?? 0;
        const feedback =
          msg.action === 'merge'
            ? `Pull request #${number} merged.`
            : msg.action === 'close'
              ? `Pull request #${number} closed.`
              : 'Pull request updated.';
        useGitStore.getState().setPullRequestFeedback(feedback);
        useGitStore.getState().setPullRequestDetail(null);
        break;
      }
      case 'term.list': {
        const arr = Array.isArray(msg.tabs) ? msg.tabs : [];
        const existing = useTerminalStore.getState().tabs;
        const newTabs: Tab[] = arr.map((item: any) => {
          const id = item.id ?? '';
          const title = item.title ?? '';
          const alive = item.alive ?? true;
          const prev = existing.find((t) => t.id === id);
          return prev
            ? { ...prev, title, alive }
            : { id, title, alive, raw: '' };
        });
        useTerminalStore.getState().setTabs(newTabs);
        break;
      }
      case 'term.replay': {
        const tabId = msg.tab ?? '';
        const data = msg.data ?? '';
        useTerminalStore.getState().updateTab(tabId, (tab) => ({
          ...tab,
          raw: data.slice(-RAW_BUFFER_CAP),
        }));
        break;
      }
      case 'term.data': {
        const tabId = msg.tab ?? '';
        const data = msg.data ?? '';
        useTerminalStore.getState().updateTab(tabId, (tab) => ({
          ...tab,
          raw: (tab.raw + data).slice(-RAW_BUFFER_CAP),
        }));
        // Parse agent events from raw terminal output
        this.agentParser.parse(data, tabId, (event) => {
          useAgentStore.getState().addEvent(event);
        });
        this.updateCostTracker(data);
        // Live state: data arriving = agent running
        useAgentStore.getState().applyLiveState(tabId, { type: 'running' });
        const runningTab = useTerminalStore.getState().tabs.find((t) => t.id === tabId);
        updateLiveNotification(tabId, { type: 'running' }, runningTab?.title);
        break;
      }
      case 'term.exit': {
        const tabId = msg.tab ?? '';
        const code = msg.code ?? 0;
        useTerminalStore.getState().updateTab(tabId, (tab) => ({
          ...tab,
          alive: false,
          raw: tab.raw + `\r\n[Process exited with code ${code}]\r\n`,
        }));
        useAgentStore.getState().applyLiveState(tabId, { type: 'finished', code });
        const exitedTitle = useTerminalStore.getState().tabs.find((t) => t.id === tabId)?.title;
        updateLiveNotification(tabId, { type: 'finished', code }, exitedTitle);
        break;
      }
      case 'agent.event': {
        const tab = msg.tab ?? 'agent-session';
        const event = msg.event ?? {};
        const kind = event.type ?? msg.kind ?? '';
        const summary =
          typeof event.content === 'string'
            ? event.content
            : typeof msg.payload === 'string'
              ? msg.payload
              : '';
        const agentId = event.agentId ?? '';
        const ts = event.timestamp ?? Date.now();

        if (kind === 'awaiting_approval') {
          // Sticky waiting state + high-priority notification
          useAgentStore.getState().applyLiveState(tab, {
            type: 'waiting',
            snippet: this.extractSnippet(summary),
          });
          const title = useTerminalStore.getState().tabs.find((t) => t.id === tab)?.title;
          updateLiveNotification(tab, { type: 'waiting', snippet: this.extractSnippet(summary) }, title);
        }

        const ev: AgentEvent = { ts, kind, summary: summary.slice(0, 200), tab, agentId };
        useAgentStore.getState().addEvent(ev);
        // Persist agent event to SQLite (same as Kotlin's db.dao().addEvent())
        try {
          persistEvent(tab, kind, summary, ts);
        } catch {}
        break;
      }
      case 'token.refresh': {
        const newToken = msg.token ?? '';
        if (newToken && this.lastMachine) {
          useMachinesStore.getState().updateToken(this.lastMachine.id, newToken);
          this.lastMachine = { ...this.lastMachine, token: newToken };
        }
        break;
      }
      case 'devservers': {
        const arr = Array.isArray(msg.list) ? msg.list : [];
        const servers = arr
          .filter((item: any) => typeof item?.pid === 'number')
          .map((item: any) => ({
            pid: item.pid,
            cmd: item.cmd ?? '',
            port: typeof item.port === 'number' ? item.port : null,
            managed: item.managed ?? false,
          }));
        useDevServerStore.getState().setServers(servers);
        break;
      }
      case 'devserver.log': {
        const port = typeof msg.port === 'number' ? msg.port : null;
        const data = msg.data ?? '';
        if (port != null) {
          useDevServerStore.getState().appendLog(port, data);
        }
        break;
      }
      case 'workspace.list': {
        const arr = Array.isArray(msg.list) ? msg.list : [];
        const workspaces = arr.map((item: any) => ({
          name: item.name ?? '',
          uri: item.uri ?? '',
        }));
        useWorkspaceStore.getState().setWorkspaces(workspaces);
        break;
      }
      case 'error': {
        const errorMsg = msg.msg ?? 'unknown error';
        console.error('[PocketCode] Server error:', errorMsg);
        break;
      }
    }
  }

  private updateCostTracker(chunk: string): void {
    const inputMatch = chunk.match(/(\d[\d,]*)\s*input\s*tokens?/i);
    const outputMatch = chunk.match(/(\d[\d,]*)\s*output\s*tokens?/i);
    let changed = false;
    if (inputMatch) {
      const val = parseInt(inputMatch[1].replace(/,/g, ''), 10);
      if (!isNaN(val)) { this.costState.input += val; changed = true; }
    }
    if (outputMatch) {
      const val = parseInt(outputMatch[1].replace(/,/g, ''), 10);
      if (!isNaN(val)) { this.costState.output += val; changed = true; }
    }
    if (changed) {
      useConnectionStore.getState().setCostUsd(this.getCostUsd());
    }
  }

  getCostUsd(): number {
    return (this.costState.input + this.costState.output) * 3.0 / 1_000_000;
  }

  getLiveStateSummary(): string {
    const states = useAgentStore.getState().liveStates;
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

  private gitFeedback(action: string, branch: string | null, fileCount: number): string {
    const branchName = branch ?? 'current branch';
    const remainingText =
      fileCount === 1
        ? '1 local change is still uncommitted.'
        : `${fileCount} local changes are still uncommitted.`;

    switch (action) {
      case 'stage': return 'Changes staged — ready to commit locally.';
      case 'unstage': return 'Changes unstaged.';
      case 'commit':
        return fileCount === 0
          ? 'Committed locally — tap Push to origin to publish it.'
          : `Committed staged changes locally. ${remainingText}`;
      case 'push':
        return fileCount === 0
          ? `Pushed to origin/${branchName} — local and remote are in sync.`
          : `Pushed to origin/${branchName}. ${remainingText}`;
      case 'pull': return `Pulled the latest changes from origin/${branchName}.`;
      case 'checkout': return `Switched to ${branchName}.`;
      default: return 'Git operation completed.';
    }
  }

  private extractSnippet(payload: string): string {
    try {
      const obj = JSON.parse(payload);
      return (obj.snippet ?? obj.summary ?? payload).slice(0, 200);
    } catch {
      return payload.slice(0, 200);
    }
  }

  private scheduleReconnect(machine: PairedMachine, attempt: number): void {
    if (this.userDisconnected) return;
    this.cancelReconnect();

    const nextAttempt = attempt + 1;
    const delayMs = RECONNECT_BACKOFF_MS[Math.min(nextAttempt - 1, RECONNECT_BACKOFF_MS.length - 1)];

    this.reconnectTimer = setTimeout(() => {
      if (!this.userDisconnected && this.lastMachine?.id === machine.id) {
        this.openWebSocket(this.lastMachine, nextAttempt);
      }
    }, delayMs);
  }

  private cancelReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private startPing(): void {
    this.stopPing();
    this.pingInterval = setInterval(() => {
      this.send('{"t":"pong"}');
    }, 20_000);
  }

  private stopPing(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }
}

let _connection: ConnectionManager | null = null;

export function getConnection(): ConnectionManager {
  if (!_connection) {
    _connection = new ConnectionManager();
  }
  return _connection;
}
