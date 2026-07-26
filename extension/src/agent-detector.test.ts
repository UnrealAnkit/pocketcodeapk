import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ApprovalDetector, APPROVAL_KEYS } from './agent-detector';

test('ApprovalDetector fires on common y/n prompts', () => {
  const d = new ApprovalDetector();
  const hit = d.check('tab-a', 'Allow this action? (y/n)');
  assert.ok(hit, 'expected a hit for (y/n)');
  assert.match(hit!.snippet, /y\/n/i);
});

// Real CLI prompt shapes, transcribed from actual stdout. One per agent.
// If a tool changes its prompt format, the corresponding test fails first.
const CLI_PROMPTS: Array<[string, string]> = [
  ['claude-code', 'Allow this action? Use Bash to run: rm -rf node_modules\n\n  1. Yes 2. No\n(y/n)'],
  ['claude-code-dontask', 'Do you want to proceed?\n  ❯ 1. Yes\n    2. Yes, and don\'t ask again for this command (y/n)'],
  ['codex', '  Allow command? [Y/n] '],
  ['gemini', 'Do you want to continue? (Y/n)'],
  ['aider', 'Allow edits to src/foo.ts? (y)es/(n)o '],
  ['aider-confirm', 'Y, edit src/foo.ts?'],
  ['generic-bracket', 'Run command? [y/N] '],
  ['claude-code-trust-folder', 'Do you trust the files in this folder?\n\n  1. Yes, proceed\n  2. No, exit\n'],
];

for (const [cli, prompt] of CLI_PROMPTS) {
  test(`ApprovalDetector fires on ${cli} prompt shape`, () => {
    const d = new ApprovalDetector();
    assert.ok(d.check(`tab-${cli}`, prompt), `expected hit for ${cli} prompt`);
  });
}

// The style drives which keystroke Approve sends. Getting it wrong means the
// button silently does nothing, so pin the classification per agent shape.
const STYLE_EXPECTATIONS: Array<[string, string, 'menu' | 'line']> = [
  ['claude-code selection list', 'Do you want to proceed?\n❯ 1. Yes\n  2. No', 'menu'],
  ['claude-code numbered menu', 'Allow this action?\n  1. Yes\n  2. No', 'menu'],
  ['trust-folder dialog', 'Do you trust the files in this folder?\n  1. Yes, proceed\n  2. No, exit', 'menu'],
  ['aider line prompt', 'Allow edits to src/foo.ts? (y)es/(n)o ', 'line'],
  ['codex bracket prompt', 'Allow command? [Y/n] ', 'line'],
  ['bare question', 'Allow this action?', 'menu'],
];

for (const [name, prompt, expected] of STYLE_EXPECTATIONS) {
  test(`ApprovalDetector classifies ${name} as ${expected}`, () => {
    const d = new ApprovalDetector();
    const hit = d.check('tab-x', prompt);
    assert.ok(hit, `expected hit for ${name}`);
    assert.equal(hit!.style, expected);
    assert.equal(d.styleFor('tab-x'), expected);
  });
}

test('a menu prompt beats a y/n hint rendered in the same frame', () => {
  // Claude Code paints a selection list and a "(y/n)" affordance together.
  // The list is what is actually reading keypresses.
  const d = new ApprovalDetector();
  const hit = d.check('tab-a', 'Do you want to proceed?\n❯ 1. Yes\n  2. No (y/n)');
  assert.equal(hit!.style, 'menu');
  assert.equal(APPROVAL_KEYS[hit!.style].approve, '\r');
});

test('styleFor defaults to menu for an unseen tab', () => {
  const d = new ApprovalDetector();
  assert.equal(d.styleFor('never-seen'), 'menu');
});

test('forget() drops the recorded style, not just the cooldown', () => {
  const d = new ApprovalDetector();
  d.check('tab-a', 'Allow edits? (y)es/(n)o');
  assert.equal(d.styleFor('tab-a'), 'line');
  d.forget('tab-a');
  assert.equal(d.styleFor('tab-a'), 'menu');
});

test('ApprovalDetector cooldown suppresses re-fire on same tab', () => {
  const d = new ApprovalDetector();
  assert.ok(d.check('tab-a', 'Continue? (yes/no)'));
  assert.equal(d.check('tab-a', 'Continue? (yes/no) again'), null);
});

test('ApprovalDetector clear() lets the next prompt fire immediately', () => {
  const d = new ApprovalDetector();
  assert.ok(d.check('tab-a', 'Approve?'));
  d.clear('tab-a');
  assert.ok(d.check('tab-a', 'Approve? again'));
});

test('ApprovalDetector tracks tabs independently', () => {
  const d = new ApprovalDetector();
  assert.ok(d.check('tab-a', 'do you want to proceed?'));
  assert.ok(d.check('tab-b', 'do you want to proceed?'));
  assert.equal(d.check('tab-a', 'do you want to proceed? still'), null);
});

test('ApprovalDetector forget() drops tab state', () => {
  const d = new ApprovalDetector();
  assert.ok(d.check('tab-a', '[Y/n] proceed'));
  d.forget('tab-a');
  assert.ok(d.check('tab-a', '[Y/n] proceed again'));
});

test('ApprovalDetector ignores non-prompt output', () => {
  const d = new ApprovalDetector();
  assert.equal(d.check('tab-a', 'compiling 12 files…'), null);
  assert.equal(d.check('tab-a', 'Running tests…'), null);
});

// Regression: these all matched before the tail restriction, so an ordinary
// build or test run raised an approval notification whose Approve button was
// wired straight to the shell's stdin.
test('ApprovalDetector ignores prompt-like words buried in scrollback', () => {
  const d = new ApprovalDetector();
  const noise = [
    'src/auth.ts:14 warning: should we continue? see TODO',
    ...Array.from({ length: 40 }, (_, i) => `  ✓ test case ${i} passed`),
    'Done in 4.21s',
  ].join('\n');
  assert.equal(d.check('tab-a', noise), null);
});

test('ApprovalDetector ignores a pager hint followed by more output', () => {
  const d = new ApprovalDetector();
  const noise = [
    '-- press enter to continue --',
    ...Array.from({ length: 20 }, (_, i) => `line ${i} of the diff`),
    'end of file',
  ].join('\n');
  assert.equal(d.check('tab-a', noise), null);
});

test('ApprovalDetector ignores the terminal echo of the user own keystrokes', () => {
  const d = new ApprovalDetector();
  const typed = 'git commit -m "ask before you proceed?"\n';
  d.noteInput('tab-a', typed);
  // What a shell echoes back: its prompt, then the command verbatim.
  const echoed = 'user@box:~/proj$ git commit -m "ask before you proceed?"';
  assert.equal(d.check('tab-a', echoed), null);
});

test('ApprovalDetector still fires for a real prompt after unrelated input', () => {
  const d = new ApprovalDetector();
  d.noteInput('tab-a', 'claude\n');
  const hit = d.check('tab-a', 'user@box:~$ claude\nDo you want to proceed?\n❯ 1. Yes\n  2. No');
  assert.ok(hit, 'echo filtering must not swallow the agent prompt');
  assert.equal(hit!.style, 'menu');
});

test('ApprovalDetector matches through ANSI colour codes', () => {
  const d = new ApprovalDetector();
  const colored = '\x1b[1m\x1b[36mDo you want to proceed?\x1b[0m\n\x1b[32m❯ 1. Yes\x1b[0m\n  2. No';
  const hit = d.check('tab-a', colored);
  assert.ok(hit, 'expected a hit despite colour codes');
  assert.equal(hit!.style, 'menu');
});

test('the notification snippet is free of escape sequences', () => {
  const d = new ApprovalDetector();
  const hit = d.check('tab-a', '\x1b[?2004l\x1b[1mAllow this action?\x1b[0m \x1b]0;title\x07(y/n)');
  assert.ok(hit);
  assert.doesNotMatch(hit!.snippet, /\x1b/, `snippet still contains ANSI: ${JSON.stringify(hit!.snippet)}`);
  assert.match(hit!.snippet, /Allow this action\?/);
});

test('ApprovalDetector still fires when the prompt is the last thing printed', () => {
  const d = new ApprovalDetector();
  const output = [
    ...Array.from({ length: 40 }, (_, i) => `  reading file ${i}`),
    'Do you want to proceed?',
    '❯ 1. Yes',
    '  2. No',
  ].join('\n');
  const hit = d.check('tab-a', output);
  assert.ok(hit, 'expected a hit when the prompt trails the output');
  assert.equal(hit!.style, 'menu');
});
