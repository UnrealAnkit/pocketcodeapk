import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as os from 'node:os';
import { WebSocket } from 'ws';
import { Server } from './index';
import { Auth } from './auth';
import { newToken } from '../security/token';

// Two phones can hold sockets to the same server, and they share one terminal
// pool. These cover the sync between them: a tab opened by one has to show up
// on the other, because clients drop term.data for tab ids they never saw.

interface Client {
  ws: WebSocket;
  msgs: any[];
  waitFor(what: string, pred: (m: any) => boolean, ms?: number): Promise<any>;
  send(msg: unknown): void;
}

function connect(port: number, token: string, deviceId: string): Promise<Client> {
  const ws = new WebSocket(`ws://127.0.0.1:${port}/ws?token=${token}`, {
    headers: { 'x-device-id': deviceId, 'x-device-fingerprint': `fp-${deviceId}` },
  });
  const msgs: any[] = [];
  ws.on('message', (raw) => {
    try { msgs.push(JSON.parse(raw.toString())); } catch { /* ignore non-json */ }
  });

  const client: Client = {
    ws,
    msgs,
    send: (msg) => ws.send(JSON.stringify(msg)),
    waitFor: (what, pred, ms = 5000) =>
      new Promise((resolve, reject) => {
        const hit = msgs.find(pred);
        if (hit) return resolve(hit);
        const timer = setTimeout(() => {
          ws.off('message', onMsg);
          reject(new Error(`timed out waiting for ${what}`));
        }, ms);
        function onMsg(raw: any) {
          let m: any;
          try { m = JSON.parse(raw.toString()); } catch { return; }
          if (!pred(m)) return;
          clearTimeout(timer);
          ws.off('message', onMsg);
          resolve(m);
        }
        ws.on('message', onMsg);
      }),
  };

  return new Promise((resolve, reject) => {
    ws.once('open', () => resolve(client));
    ws.once('error', reject);
  });
}

async function harness() {
  const auth = new Auth(60);
  const token = newToken();
  auth.issue(token);
  const server = new Server({
    port: 0,
    workspaceRoot: os.tmpdir(),
    auth,
    maxTerminals: 4,
  });
  const port = await server.listen();
  const a = await connect(port, token, 'phone-a');
  const b = await connect(port, token, 'phone-b');
  // Both get an initial (empty) term.list on connect; drain it so later
  // assertions cannot match the greeting instead of the broadcast.
  await a.waitFor('initial term.list', (m) => m.t === 'term.list');
  await b.waitFor('initial term.list', (m) => m.t === 'term.list');
  a.msgs.length = 0;
  b.msgs.length = 0;
  return { server, a, b, auth, token };
}

test('a tab opened by one client is announced to the other', async () => {
  const { server, a, b } = await harness();
  try {
    a.send({ t: 'term.open', cols: 80, rows: 24 });

    const onB = await b.waitFor('term.list on the other client', (m) => m.t === 'term.list' && m.tabs.length === 1);
    assert.equal(onB.tabs.length, 1, 'the second phone should learn about the new tab');

    const onA = await a.waitFor('term.list on the opener', (m) => m.t === 'term.list' && m.tabs.length === 1);
    assert.equal(onA.tabs[0].id, onB.tabs[0].id, 'both clients should see the same tab id');
  } finally {
    server.close();
  }
});

test('closing a tab is announced to the other client', async () => {
  const { server, a, b } = await harness();
  try {
    a.send({ t: 'term.open', cols: 80, rows: 24 });
    const list = await b.waitFor('tab open', (m) => m.t === 'term.list' && m.tabs.length === 1);
    const tab = list.tabs[0].id;
    b.msgs.length = 0;

    a.send({ t: 'term.close', tab });
    const after = await b.waitFor('tab close', (m) => m.t === 'term.list' && m.tabs.length === 0);
    assert.equal(after.tabs.length, 0, 'the second phone should see the tab disappear');
  } finally {
    server.close();
  }
});

test('two devices may share one token', async () => {
  const { server, auth } = await harness();
  try {
    assert.equal(auth.connectedDeviceCount(), 2);
  } finally {
    server.close();
  }
});
