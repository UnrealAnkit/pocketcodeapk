#!/usr/bin/env bash
# Pulls the brand typefaces into android/app/src/main/res/font.
# Android resource names must be lowercase with underscores.
set -euo pipefail

DEST=/mnt/d/PROJECTS/pocketcodeapk/android/app/src/main/res/font
mkdir -p "$DEST"

fetch() {
  local name="$1" url="$2"
  local out="$DEST/$name"
  curl -sSL --fail -o "$out" "$url"
  local size
  size=$(stat -c %s "$out")
  # A GitHub 404 page is a few hundred bytes of HTML; a real face is tens of KB.
  if [ "$size" -lt 20000 ] || ! file "$out" | grep -qi 'font'; then
    echo "FAIL $name ($size bytes): $(file -b "$out")"
    rm -f "$out"
    return 1
  fi
  echo "ok   $name  $size bytes"
}

fetch jetbrains_mono_regular.ttf \
  'https://github.com/JetBrains/JetBrainsMono/raw/master/fonts/ttf/JetBrainsMono-Regular.ttf'
fetch jetbrains_mono_medium.ttf \
  'https://github.com/JetBrains/JetBrainsMono/raw/master/fonts/ttf/JetBrainsMono-Medium.ttf'
fetch inter_variable.ttf \
  'https://raw.githubusercontent.com/google/fonts/main/ofl/inter/Inter%5Bopsz%2Cwght%5D.ttf'
fetch space_grotesk_variable.ttf \
  'https://raw.githubusercontent.com/google/fonts/main/ofl/spacegrotesk/SpaceGrotesk%5Bwght%5D.ttf'

echo '--- installed ---'
ls -la "$DEST"
