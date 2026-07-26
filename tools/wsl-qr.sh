#!/usr/bin/env bash
# Renders tools/pairing.local.json into tools/pairing-qr.png so you can open the
# QR full-screen instead of scanning it out of a scrolled terminal buffer.
set -euo pipefail

export PATH="$HOME/.local/bin:$PATH"
cd /mnt/d/PROJECTS/pocketcodeapk
node tools/pairing-qr.js "$@"
