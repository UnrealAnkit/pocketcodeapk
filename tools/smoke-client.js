#!/usr/bin/env node
/**
 * End-to-end smoke test against a running PocketCode server, over whatever
 * tunnel it published. Stands in for the phone so the wire path can be
 * verified without a device in hand.
 *
 *   node tools/smoke-client.js '<pairing-json>'
 *
 * Checks, in order:
 *   1. /api/health answers over the public URL
 *   2. WS upgrade succeeds with the pairing token
 *   3. term.open yields a tab and the shell is a *real* PTY (tty(1) resolves)
 *   4. a menu-style approval prompt raises agent.event awaiting_approval
 *   5. agent.approve delivers CR (not "y\n") to a menu-style prompt
 */
const WebSocket = require('ws');

const payload = JSON.parse(process.argv[2]);
const httpUrl = payload.url.replace(/^wss:/, 'https:').replace(/^ws:/, 'http:').replace(/\/ws$/, '');

const results = [];
function record(name, ok, detail) {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  — ${detail}` : ''}`);
}

const deferred = new Map();
function waitFor(label, predicate, timeoutMs = 20000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      deferred.delete(key);
      reject(new Error(`timed out waiting for ${label}`));
    }, timeoutMs);
    const key = Symbol(label);
    deferred.set(key, (msg) => {
      if (!predicate(msg)) return false;
      clearTimeout(timer);
      deferred.delete(key);
      resolve(msg);
      return true;
    });
  });
}

async function main() {
  const health = await fetch(`${httpUrl}/api/health`).then((r) => r.json());
  record('health endpoint reachable over tunnel', health.ok === true, JSON.stringify(health));

  const ws = new WebSocket(`${payload.url}?token=${encodeURIComponent(payload.token)}`, {
    headers: { 'x-device-id': 'smoke-client', 'x-device-fingerprint': 'smoke-fp' },
  });

  // Accumulate PTY output per tab so assertions can look at the whole stream.
  const out = new Map();

  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw.toString()); } catch { return; }
    if (msg.t === 'term.data' || msg.t === 'term.replay') {
      out.set(msg.tab, (out.get(msg.tab) ?? '') + msg.data);
    }
    for (const fn of [...deferred.values()]) fn(msg);
  });

  await new Promise((resolve, reject) => {
    ws.once('open', resolve);
    ws.once('error', reject);
    ws.once('unexpected-response', (_req, res) => reject(new Error(`HTTP ${res.statusCode}`)));
  });
  record('websocket authenticated with pairing token', true);

  await waitFor('term.list', (m) => m.t === 'term.list');

  ws.send(JSON.stringify({ t: 'term.open', cols: 100, rows: 30 }));
  const list = await waitFor('term.list after open', (m) => m.t === 'term.list' && m.tabs.length > 0);
  const tab = list.tabs[list.tabs.length - 1].id;
  record('term.open created a tab', Boolean(tab), tab);

  // A pipe would make tty(1) print "not a tty". Getting /dev/pts/N back is the
  // proof that the Python openpty helper is doing its job.
  ws.send(JSON.stringify({ t: 'term.input', tab, data: 'tty; echo MARKER_$((6*7))\n' }));
  await waitFor('shell echo', () => (out.get(tab) ?? '').includes('MARKER_42'), 20000).catch(() => {});
  const shellOut = out.get(tab) ?? '';
  record('shell runs commands', shellOut.includes('MARKER_42'));
  record('allocated a real PTY (not a pipe)', /\/dev\/pts\/\d+/.test(shellOut),
    (shellOut.match(/\/dev\/(pts\/\d+|tty\S*)|not a tty/) ?? ['no tty line'])[0]);

  // Stand-in agent: prints the menu-style prompt Claude Code draws, then reads
  // one raw byte so we can see exactly which keystroke arrived. It is staged as
  // a base64 blob because a shell echoes the command you type -- writing the
  // prompt text inline would make the detector fire on the echo rather than on
  // the script's output, which is the very thing it must not do.
  // stty raw mirrors how an agent TUI reads keys. It also matters for the
  // assertion: in cooked mode the line discipline rewrites CR to NL (which is
  // what a physical Enter key produces too), so only raw mode shows the byte
  // that was actually sent.
  const agentScript = [
    `printf 'Do you want to proceed?\\n\\xe2\\x9d\\xaf 1. Yes\\n  2. No\\n'`,
    `stty raw -echo`,
    `head -c 1 | od -An -c | sed 's/^/KEYBYTE:/'`,
    `stty sane`,
  ].join('\n');
  const b64 = Buffer.from(agentScript, 'utf8').toString('base64');
  ws.send(JSON.stringify({ t: 'term.input', tab, data: `echo ${b64} | base64 -d > /tmp/pc-agent.sh\n` }));
  await new Promise((r) => setTimeout(r, 1500));

  out.set(tab, '');
  ws.send(JSON.stringify({ t: 'term.input', tab, data: 'bash /tmp/pc-agent.sh\n' }));

  const evt = await waitFor(
    'agent.event awaiting_approval',
    (m) => m.t === 'agent.event' && (m.kind === 'awaiting_approval' || m.event?.kind === 'awaiting_approval'),
    20000,
  ).catch((e) => ({ error: e.message }));
  const snippet = evt.payload?.snippet ?? evt.event?.snippet ?? '';
  record('menu prompt raised an approval event', !evt.error, evt.error ?? JSON.stringify(snippet));
  record('notification snippet is human-readable', Boolean(snippet) && !/\x1b/.test(snippet), JSON.stringify(snippet));

  ws.send(JSON.stringify({ t: 'agent.approve', session: tab }));
  await waitFor('keybyte echo', () => (out.get(tab) ?? '').includes('KEYBYTE:'), 20000).catch(() => {});
  const keyLine = (out.get(tab) ?? '').split('\n').find((l) => l.includes('KEYBYTE:')) ?? '';
  const byte = keyLine.replace(/.*KEYBYTE:/, '').trim();
  record('approve delivered Enter to a menu-style prompt', /^(\\r|\\n)$/.test(byte),
    byte ? `got ${byte}` : 'no KEYBYTE line seen');
  // The regression this guards: the old code wrote "y\n", which a selection
  // menu reads as a stray character rather than as "confirm".
  record('approve did not type a literal y', byte !== 'y', byte ? `got ${byte}` : 'no byte seen');

  ws.send(JSON.stringify({ t: 'term.close', tab }));
  ws.close();

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  console.log('SMOKE_DONE');
  process.exit(failed.length ? 1 : 0);
}

main().catch((e) => {
  console.error(`smoke-client: ${e.message}`);
  console.log('SMOKE_DONE');
  process.exit(1);
});
