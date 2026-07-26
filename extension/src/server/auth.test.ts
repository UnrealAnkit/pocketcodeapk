import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Auth } from './auth';
import { newToken } from '../security/token';

function pair(auth: Auth, deviceId = 'phone-1', fp = 'fp-1') {
  const raw = newToken();
  auth.issue(raw);
  const dev = auth.authenticate(raw, deviceId, fp);
  assert.ok(dev, 'expected the first pairing to be accepted');
  return raw;
}

test('authenticate binds a device on first use', () => {
  const auth = new Auth(60);
  const raw = pair(auth);
  assert.equal(auth.connectedDeviceCount(), 1);
  assert.ok(auth.authenticate(raw, 'phone-1', 'fp-1'), 'same device should reconnect');
});

test('authenticate rejects a fingerprint mismatch on a bound device', () => {
  const auth = new Auth(60);
  const raw = pair(auth);
  assert.equal(auth.authenticate(raw, 'phone-1', 'different-fp'), null);
});

test('an unknown token is rejected', () => {
  const auth = new Auth(60);
  assert.equal(auth.authenticate(newToken(), 'phone-1', 'fp-1'), null);
});

test('an expired token is rejected', () => {
  // Negative lifetime puts the expiry in the past. An expiry of exactly 0 lands
  // on the current millisecond, and the check is `now > exp`, so it races.
  const auth = new Auth(-1);
  const raw = newToken();
  auth.issue(raw);
  assert.equal(auth.authenticate(raw, 'phone-1', 'fp-1'), null);
});

// The bug this pins: revokeAll() used to clear each record's device map while
// leaving the token hash in place, and authenticate() re-binds any device it
// does not already know. A revoked phone therefore reconnected successfully on
// its very next attempt, so "Disconnect All Devices" revoked nothing at all.
test('revokeAll invalidates the token, not just the device binding', () => {
  const auth = new Auth(60);
  const raw = pair(auth);

  assert.equal(auth.revokeAll(), 1, 'should report the device it disconnected');
  assert.equal(auth.connectedDeviceCount(), 0);
  assert.equal(
    auth.authenticate(raw, 'phone-1', 'fp-1'),
    null,
    'a revoked token must not authenticate again',
  );
  assert.equal(
    auth.authenticate(raw, 'phone-2', 'fp-2'),
    null,
    'nor should it bind a fresh device',
  );
});

test('revokeAll emits so live sockets can be torn down', () => {
  const auth = new Auth(60);
  pair(auth);
  let fired = 0;
  auth.on('revoked.all', () => { fired++; });
  auth.revokeAll();
  assert.equal(fired, 1);
});

test('revokeDevice drops one device but leaves the token usable', () => {
  const auth = new Auth(60);
  const raw = newToken();
  auth.issue(raw);
  auth.authenticate(raw, 'phone-1', 'fp-1');
  auth.authenticate(raw, 'phone-2', 'fp-2');
  assert.equal(auth.connectedDeviceCount(), 2);

  assert.equal(auth.revokeDevice(raw, 'phone-1'), true);
  assert.equal(auth.connectedDeviceCount(), 1);
  assert.ok(auth.authenticate(raw, 'phone-2', 'fp-2'), 'the other device keeps working');
});

test('renewIfExpiring leaves a healthy token alone', () => {
  const auth = new Auth(60 * 24);   // a day out, well past the 6h threshold
  const raw = pair(auth);
  assert.equal(auth.renewIfExpiring(raw), null);
});

test('renewIfExpiring rotates a near-expiry token and carries devices over', () => {
  const auth = new Auth(60);        // 1h left, inside the 6h renewal window
  const raw = pair(auth);
  const renewal = auth.renewIfExpiring(raw);
  assert.ok(renewal, 'expected a renewal');
  assert.notEqual(renewal!.newRawToken, raw);
  assert.ok(
    auth.authenticate(renewal!.newRawToken, 'phone-1', 'fp-1'),
    'the bound device should carry over to the new token',
  );
});
