// agent-detector.ts
// Heuristic, agent-agnostic detection of "waiting for user approval" prompts
// in raw PTY output.
//
// Server-side only. Feeds `agent.event` (kind: 'awaiting_approval') to phones
// so a notification with Approve/Reject actions can be raised.
//
// Two prompt shapes exist in the wild and they need *different* keystrokes:
//
//   line-style   Aider, older CLIs. Reads a line: "Allow edits? (y)es/(n)o"
//                -> answer with "y\n" / "n\n".
//   menu-style   Claude Code, Codex, Gemini. Draws a selection list and reads
//                raw keypresses: "❯ 1. Yes / 2. No". Typing "y" does nothing
//                useful here; Enter accepts the highlighted row and Esc aborts.
//
// Guessing wrong means the Approve button silently does nothing, so the style
// is recorded per tab at detection time and replayed when the user answers.

export type PromptStyle = 'menu' | 'line';

export interface ApprovalHit {
  snippet: string;
  style: PromptStyle;
}

// Keystrokes to send for each style. Exported so the server and its tests
// agree on one definition.
export const APPROVAL_KEYS: Record<PromptStyle, { approve: string; reject: string }> = {
  // Enter accepts the highlighted row (always "Yes" on first paint); Esc aborts.
  menu: { approve: '\r', reject: '\x1b' },
  line: { approve: 'y\n', reject: 'n\n' },
};

// A rendered selection list, or an explicit "just press Enter". These win over
// the line-style hints below, because Claude Code prints a menu *and* sometimes
// a "(y/n)" hint in the same frame -- the menu is what's actually listening.
const MENU_INDICATORS: RegExp[] = [
  /[❯▶➤]\s*\d?\s*\.?\s*\w/,
  /^\s*\d\s*[.)]\s*(yes|no)\b/im,
  /press enter to continue/i,
];

// Prompts that read a whole line from stdin.
const LINE_INDICATORS: RegExp[] = [
  // (y/n), [Y/n], (yes/no), [yes/no]
  /[[(]\s*(?:yes|y)\s*\/\s*(?:no|n)\s*[\])]/i,
  /\(\s*y\s*\)\s*es\s*\/\s*\(\s*n\s*\)\s*o/i,
  // Aider's spelled-out confirmation, e.g. "Y, edit src/foo.ts?"
  /^\s*Y\s*,\s*edit\b/im,
];

// Anything here means "an agent is waiting on the user".
const APPROVAL_PATTERNS: RegExp[] = [
  ...MENU_INDICATORS,
  ...LINE_INDICATORS,
  /(allow|approve|proceed|confirm)\b[^\n]*\?/i,
  /do you want to (proceed|continue)\b[^\n]*\?/i,
  /allow this (action|command|tool|edit|file)\??/i,
  /approve (this|these)?\s*(change|edit|action|command|tool)?\??/i,
  /don'?t ask again/i,
  /do you trust the (files|folder)/i,
];

// Only the tail of a chunk is considered. An agent's prompt is always the last
// thing it printed, whereas build/test output is full of words like "continue?"
// and numbered lists -- matching those fired the notification (and armed an
// Approve button wired to stdin) during an ordinary `npm test`.
const TAIL_LINES = 6;

// Don't re-fire for the same tab more than once per window -- agents often
// repaint the same prompt across several stdout chunks while awaiting input.
const COOLDOWN_MS = 15_000;

// CSI/OSC/two-byte escapes. Agent TUIs interleave colour and cursor-movement
// codes with their text, which both breaks the patterns below and makes an
// unreadable notification body ("\u001b[?2004l") if a snippet is surfaced raw.
const ANSI = /\x1B(?:\[[0-?]*[ -/]*[@-~]|\][\s\S]*?(?:\x07|\x1B\\)|[@-Z\\-_])/g;

export function stripAnsi(s: string): string {
  return s.replace(ANSI, '');
}

function tailOf(chunk: string): string {
  const lines = stripAnsi(chunk)
    .split('\n')
    .map((l) => l.replace(/\r/g, '').trim())
    .filter(Boolean);
  return lines.slice(-TAIL_LINES).join('\n');
}

function classify(text: string): PromptStyle {
  if (MENU_INDICATORS.some((re) => re.test(text))) return 'menu';
  if (LINE_INDICATORS.some((re) => re.test(text))) return 'line';
  // Ambiguous ("Allow this action?" with no visible affordance). Enter is the
  // safer default: it accepts a menu's highlighted row, and at worst submits an
  // empty line to a line-style prompt, which re-prompts rather than answering
  // the wrong way.
  return 'menu';
}

// A terminal echoes what you type, so a command like `git commit -m "proceed?"`
// comes back as output and used to fire an approval notification for the user's
// own keystrokes. Input seen within this window is discounted.
const ECHO_WINDOW_MS = 3_000;
const MIN_ECHO_FRAGMENT = 8;

export class ApprovalDetector {
  private lastFired = new Map<string, number>();
  private lastStyle = new Map<string, PromptStyle>();
  private recentInput = new Map<string, { text: string; at: number }>();

  /** Record data written to a tab's stdin so its echo isn't mistaken for a
   *  prompt the agent produced. */
  noteInput(tab: string, data: string) {
    const prev = this.recentInput.get(tab);
    const carry = prev && Date.now() - prev.at < ECHO_WINDOW_MS ? prev.text : '';
    this.recentInput.set(tab, { text: (carry + data).slice(-4000), at: Date.now() });
  }

  private withoutEcho(tab: string, lines: string[]): string[] {
    const rec = this.recentInput.get(tab);
    if (!rec || Date.now() - rec.at > ECHO_WINDOW_MS) return lines;
    const typed = stripAnsi(rec.text)
      .split(/[\r\n]+/)
      .map((s) => s.trim())
      .filter((s) => s.length >= MIN_ECHO_FRAGMENT);
    if (!typed.length) return lines;
    // The echoed line carries the shell prompt as a prefix, so test containment
    // in that direction rather than comparing for equality.
    return lines.filter((l) => !typed.some((t) => l.includes(t)));
  }

  /**
   * Feed a raw PTY output chunk for a given tab.
   * Returns the snippet to surface in a notification plus the prompt style, if
   * this chunk ends in an approval prompt and the per-tab cooldown has elapsed.
   */
  check(tab: string, chunk: string): ApprovalHit | null {
    const kept = this.withoutEcho(tab, tailOf(chunk).split('\n').filter(Boolean));
    const tail = kept.join('\n');
    if (!tail) return null;
    if (!APPROVAL_PATTERNS.some((re) => re.test(tail))) return null;

    const now = Date.now();
    const last = this.lastFired.get(tab) ?? 0;
    if (now - last < COOLDOWN_MS) return null;
    this.lastFired.set(tab, now);

    const style = classify(tail);
    this.lastStyle.set(tab, style);

    const lines = tail.split('\n');
    return { snippet: (lines[lines.length - 1] ?? tail).slice(0, 200), style };
  }

  /** Style of the most recent prompt seen on this tab, for turning an
   *  Approve/Reject tap into the right keystroke. */
  styleFor(tab: string): PromptStyle {
    return this.lastStyle.get(tab) ?? 'menu';
  }

  /** Reset the cooldown for a tab -- call once the user actually responds,
   *  so the *next* prompt (if any) can notify immediately rather than waiting
   *  out the rest of the previous cooldown window. */
  clear(tab: string) {
    this.lastFired.delete(tab);
  }

  /** Drop all state for a tab that's closed/exited. */
  forget(tab: string) {
    this.lastFired.delete(tab);
    this.lastStyle.delete(tab);
    this.recentInput.delete(tab);
  }
}
