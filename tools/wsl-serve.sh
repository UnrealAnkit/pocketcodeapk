#!/usr/bin/env bash
# Start the headless PocketCode server inside WSL with a Cloudflare quick
# tunnel. Quick tunnels need no Cloudflare account, which makes this the
# lowest-friction path for a live demo.
#
#   bash tools/wsl-serve.sh [workspace-dir]
set -euo pipefail

export PATH="$HOME/.local/bin:$PATH"

WORKSPACE="${1:-/mnt/d/PROJECTS/pocketcodeapk}"
TUNNEL="${2:-cloudflare}"
cd /mnt/d/PROJECTS/pocketcodeapk/extension

echo "[serve] building..."
npm run build

echo "[serve] node $(node -v), cloudflared $("$HOME/.local/bin/cloudflared" --version 2>/dev/null | head -1)"
echo "[serve] workspace: $WORKSPACE"

PAIRING_FILE=/mnt/d/PROJECTS/pocketcodeapk/tools/pairing.local.json
: > "$PAIRING_FILE"

# Mirror the pairing payload into a file as it scrolls past, so other tooling
# (and the next shell command) can pick it up without copy-pasting JSON through
# several layers of shell quoting.
stdbuf -oL node out/cli.js "$WORKSPACE" --tunnel "$TUNNEL" 2>&1 \
  | tee /dev/stderr \
  | stdbuf -oL grep --line-buffered -o '{"v":1,[^}]*}' \
  | (read -r line; printf '%s\n' "$line" > "$PAIRING_FILE"; echo "[serve] pairing payload written to $PAIRING_FILE"; cat > /dev/null)
