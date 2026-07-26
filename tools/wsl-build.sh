#!/usr/bin/env bash
# Build + test the extension inside WSL.
#
# node_modules is kept on the Linux filesystem rather than /mnt/d: npm over the
# 9p mount is painfully slow, and any native/bin artifacts installed from
# Windows would be the wrong platform. The source stays on /mnt/d so the editor
# and WSL see the same files.
set -euo pipefail

export PATH="$HOME/.local/bin:$PATH"

SRC="/mnt/d/PROJECTS/pocketcodeapk/extension"
WORK="$HOME/pocketcode-build"

mkdir -p "$WORK"
cd "$SRC"

# Reuse a Linux-side node_modules via symlink so npm never writes to /mnt/d.
if [ ! -e "$SRC/node_modules" ]; then
  mkdir -p "$WORK/node_modules"
  ln -s "$WORK/node_modules" "$SRC/node_modules"
  echo "[deps] linked node_modules -> $WORK/node_modules"
fi

echo "[deps] npm install"
npm install --no-audit --no-fund

echo "[build] npm run build"
npm run build

echo "[test] npm test"
npm test

echo "BUILD_DONE"
