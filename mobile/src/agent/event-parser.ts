/**
 * Port of AgentTimeline.kt — removes ANSI/VT control sequences from raw PTY text
 * so the timeline heuristics match on visible content, not escape codes.
 */
const CSI = /\x1B\[[0-?]*[ -/]*[@-~]/g;
const OSC = /\x1B\][^\x07\x1B]*(?:\x07|\x1B\\)/g;
const OTHER_ESC = /\x1B.?/g;
const CTRL = /[\u0000-\u0008\u000B-\u001F\u007F]/g;

export function stripAnsi(text: string): string {
  return text
    .replace(CSI, '')
    .replace(OSC, '')
    .replace(OTHER_ESC, '')
    .replace(CTRL, '');
}

/**
 * Activity classifier. Deliberately conservative: patterns only fire on
 * clearly-structured lines, de-duplicated against last emitted summary.
 */
const FILE_CHANGED = /^(?:Edited|Created|Wrote|Updated|Modified|Deleted|Added)\s+([^\s].*)$/i;
const RAN_CMD = /^\$\s+(\S.*)$/;
const TEST_RESULT = /\b(\d+\s+(?:passed|failed|skipped)|Tests?:\s*\d+|PASSED|FAILED)\b/i;
const NOISE_ONLY = /^[\s\p{P}│─┌┐└┘├┤┬┴┼╭╮╰╯▏▎▍▌▋▊▉█░▒▓\u2800-⣿·•◆◇○●▶▷▸►]+$/u;

import type { AgentEvent } from '../state';

export class AgentEventParser {
  private lastSummary = '';

  parse(chunk: string, tab: string, sink: (event: AgentEvent) => void): void {
    const cleaned = stripAnsi(chunk);
    for (const rawLine of cleaned.split('\n')) {
      const t = rawLine.trim();
      if (t.length < 3 || NOISE_ONLY.test(t)) continue;

      const kind = FILE_CHANGED.test(t)
        ? 'file_changed'
        : RAN_CMD.test(t)
          ? 'cmd'
          : TEST_RESULT.test(t)
            ? 'tests'
            : null;

      if (!kind) continue;

      const summary = t.slice(0, 200);
      if (summary === this.lastSummary) continue;
      this.lastSummary = summary;

      sink({
        ts: Date.now(),
        kind,
        summary,
        tab,
        agentId: '',
      });
    }
  }
}
