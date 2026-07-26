#!/usr/bin/env bash
# Runs the smoke client against a server started by wsl-serve.sh.
# Reads the pairing JSON from tools/pairing.local.json (paste the line the
# server printed) so the payload never has to survive shell quoting.
set -euo pipefail

export PATH="$HOME/.local/bin:$PATH"
cd /mnt/d/PROJECTS/pocketcodeapk/extension
# The script lives in tools/, so resolve `ws` from the extension's deps.
export NODE_PATH="$(cd node_modules && pwd -P)"

PAYLOAD_FILE="${1:-/mnt/d/PROJECTS/pocketcodeapk/tools/pairing.local.json}"
node /mnt/d/PROJECTS/pocketcodeapk/tools/smoke-client.js "$(tr -d '\r\n' < "$PAYLOAD_FILE")"
