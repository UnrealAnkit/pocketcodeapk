#!/usr/bin/env bash
# Environment probe for running the PocketCode server side inside WSL.
# The Windows host has no PTY support (see extension/src/pty/manager.ts),
# so the demo path is: server + tunnel inside WSL, phone over the tunnel.

echo "=== interpreters ==="
for bin in node npm npx python3 git cloudflared ngrok tailscale devtunnel adb scrcpy; do
  p=$(command -v "$bin" 2>/dev/null)
  if [ -n "$p" ]; then
    printf '%-12s %s\n' "$bin" "$p"
  else
    printf '%-12s MISSING\n' "$bin"
  fi
done

echo
echo "=== versions ==="
node -v 2>/dev/null || echo "node: n/a"
npm -v 2>/dev/null || echo "npm: n/a"
python3 -V 2>/dev/null || echo "python3: n/a"

echo
echo "=== pty capability ==="
python3 - <<'PY' 2>&1 || echo "openpty check failed"
import pty, os
m, s = pty.openpty()
print("openpty OK, master fd", m, "slave", os.ttyname(s))
PY

echo
echo "=== repo visibility ==="
ls -d /mnt/d/PROJECTS/pocketcodeapk/extension 2>/dev/null && echo "repo reachable" || echo "repo NOT reachable"
