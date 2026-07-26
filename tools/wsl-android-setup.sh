#!/usr/bin/env bash
# Installs a JDK 17 + Android SDK into ~/.local so the APK can be built in WSL.
# No sudo, no Android Studio. Removing ~/.local/jdk17 and ~/.local/android-sdk
# undoes everything this does.
set -euo pipefail

PREFIX="$HOME/.local"
JDK_DIR="$PREFIX/jdk17"
SDK_DIR="$PREFIX/android-sdk"
mkdir -p "$PREFIX"

# --- JDK 17 (Temurin) -------------------------------------------------------
# AGP 8.5 needs 17; the system java is 8.
if [ -x "$JDK_DIR/bin/javac" ]; then
  echo "[jdk] already present: $("$JDK_DIR/bin/java" -version 2>&1 | head -1)"
else
  echo "[jdk] downloading Temurin 17..."
  curl -fsSL -o /tmp/jdk17.tar.gz \
    "https://api.adoptium.net/v3/binary/latest/17/ga/linux/x64/jdk/hotspot/normal/eclipse"
  rm -rf "$JDK_DIR"; mkdir -p "$JDK_DIR"
  tar -xzf /tmp/jdk17.tar.gz -C "$JDK_DIR" --strip-components=1
  rm -f /tmp/jdk17.tar.gz
  echo "[jdk] installed: $("$JDK_DIR/bin/java" -version 2>&1 | head -1)"
fi
export JAVA_HOME="$JDK_DIR"
export PATH="$JAVA_HOME/bin:$PATH"

# --- Android command-line tools --------------------------------------------
# sdkmanager insists on living at cmdline-tools/latest/.
CMDLINE="$SDK_DIR/cmdline-tools/latest"
if [ -x "$CMDLINE/bin/sdkmanager" ]; then
  echo "[sdk] cmdline-tools already present"
else
  echo "[sdk] downloading command-line tools..."
  mkdir -p "$SDK_DIR/cmdline-tools"
  ok=0
  for build in 13114758 11076708 10406996; do
    url="https://dl.google.com/android/repository/commandlinetools-linux-${build}_latest.zip"
    if curl -fsSL -o /tmp/cmdline.zip "$url"; then
      echo "[sdk] fetched build $build"
      ok=1
      break
    fi
    echo "[sdk] build $build unavailable, trying next"
  done
  [ "$ok" = 1 ] || { echo "[sdk] could not download command-line tools"; exit 1; }

  # python3 rather than unzip, which is not guaranteed on a slim Ubuntu image.
  python3 - <<'PY'
import zipfile, os
dest = os.path.expanduser("~/.local/android-sdk/cmdline-tools")
with zipfile.ZipFile("/tmp/cmdline.zip") as z:
    z.extractall(dest)
PY
  rm -f /tmp/cmdline.zip
  rm -rf "$CMDLINE"
  mv "$SDK_DIR/cmdline-tools/cmdline-tools" "$CMDLINE"
  chmod +x "$CMDLINE/bin/"*
fi

export ANDROID_HOME="$SDK_DIR"
export ANDROID_SDK_ROOT="$SDK_DIR"
export PATH="$CMDLINE/bin:$SDK_DIR/platform-tools:$PATH"

# --- SDK packages -----------------------------------------------------------
echo "[sdk] accepting licenses..."
yes | sdkmanager --sdk_root="$SDK_DIR" --licenses > /dev/null 2>&1 || true

echo "[sdk] installing platform 35 + build-tools (this is the slow part)..."
sdkmanager --sdk_root="$SDK_DIR" \
  "platform-tools" \
  "platforms;android-35" \
  "build-tools;35.0.0"

# --- Point Gradle at the SDK ------------------------------------------------
PROPS="/mnt/d/PROJECTS/pocketcodeapk/android/local.properties"
printf 'sdk.dir=%s\n' "$SDK_DIR" > "$PROPS"
echo "[sdk] wrote $PROPS"

echo
echo "=== result ==="
"$JDK_DIR/bin/java" -version 2>&1 | head -1
echo "ANDROID_HOME=$SDK_DIR"
ls "$SDK_DIR/platforms" 2>/dev/null || echo "no platforms dir"
echo "ANDROID_SETUP_DONE"
