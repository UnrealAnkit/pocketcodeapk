#!/usr/bin/env bash
# Installs the server-side toolchain into WSL, no sudo required.
# Everything lands under ~/.local so it can be removed by deleting that tree.
set -euo pipefail

PREFIX="$HOME/.local"
BIN="$PREFIX/bin"
mkdir -p "$BIN"

# --- Node (official tarball; avoids nvm's shell-init requirement) -----------
if [ -x "$PREFIX/node/bin/node" ]; then
  echo "[node] already installed: $("$PREFIX/node/bin/node" -v)"
else
  echo "[node] resolving latest LTS..."
  read -r NODE_VER NODE_ARCH <<EOF
$(python3 - <<'PY'
import json, platform, urllib.request
with urllib.request.urlopen("https://nodejs.org/dist/index.json", timeout=60) as r:
    releases = json.load(r)
lts = next(r for r in releases if r["lts"])
arch = {"x86_64": "x64", "aarch64": "arm64"}[platform.machine()]
print(lts["version"], arch)
PY
)
EOF
  TARBALL="node-${NODE_VER}-linux-${NODE_ARCH}.tar.xz"
  echo "[node] downloading ${TARBALL}"
  curl -fsSL -o "/tmp/${TARBALL}" "https://nodejs.org/dist/${NODE_VER}/${TARBALL}"
  rm -rf "$PREFIX/node"
  mkdir -p "$PREFIX/node"
  tar -xJf "/tmp/${TARBALL}" -C "$PREFIX/node" --strip-components=1
  rm -f "/tmp/${TARBALL}"
  echo "[node] installed $("$PREFIX/node/bin/node" -v)"
fi
ln -sf "$PREFIX/node/bin/node" "$BIN/node"
ln -sf "$PREFIX/node/bin/npm" "$BIN/npm"
ln -sf "$PREFIX/node/bin/npx" "$BIN/npx"

# --- cloudflared (quick tunnels need no account, best for a demo) -----------
if [ -x "$BIN/cloudflared" ]; then
  echo "[cloudflared] already installed"
else
  case "$(uname -m)" in
    x86_64)  CF_ARCH=amd64 ;;
    aarch64) CF_ARCH=arm64 ;;
    *) echo "[cloudflared] unsupported arch $(uname -m)"; CF_ARCH="" ;;
  esac
  if [ -n "$CF_ARCH" ]; then
    echo "[cloudflared] downloading ${CF_ARCH}"
    curl -fsSL -o "$BIN/cloudflared" \
      "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-${CF_ARCH}"
    chmod +x "$BIN/cloudflared"
  fi
fi

# --- PATH wiring ------------------------------------------------------------
if ! grep -qs 'HOME/.local/bin' "$HOME/.bashrc"; then
  echo 'export PATH="$HOME/.local/bin:$PATH"' >> "$HOME/.bashrc"
  echo "[path] added ~/.local/bin to .bashrc"
fi

export PATH="$BIN:$PATH"
echo
echo "=== result ==="
node -v
npm -v
"$BIN/cloudflared" --version 2>/dev/null || echo "cloudflared: not installed"
echo "SETUP_DONE"
