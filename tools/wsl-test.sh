#!/usr/bin/env bash
# Fast rebuild + test loop for the extension (assumes deps already installed
# by wsl-build.sh). Writes a log next to the repo so the Windows side can read
# it regardless of how the shell pipes output.
set -euo pipefail

export PATH="$HOME/.local/bin:$PATH"
cd /mnt/d/PROJECTS/pocketcodeapk/extension

npm run build
npm test
echo "TEST_DONE"
