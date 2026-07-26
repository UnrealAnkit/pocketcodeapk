#!/usr/bin/env bash
# Builds the debug APK in WSL using the toolchain from wsl-android-setup.sh.
#
#   bash tools/wsl-android-build.sh [gradle-task...]
#
# The Gradle project is copied to the Linux filesystem before building. Kotlin
# and KSP touch tens of thousands of small files, and doing that across the
# /mnt/d 9p mount is several times slower than ext4. Sources are copied in on
# every run and the APK is copied back out, so /mnt/d stays the source of truth.
set -euo pipefail

export JAVA_HOME="$HOME/.local/jdk17"
export ANDROID_HOME="$HOME/.local/android-sdk"
export ANDROID_SDK_ROOT="$ANDROID_HOME"
export PATH="$JAVA_HOME/bin:$ANDROID_HOME/platform-tools:$PATH"
export GRADLE_USER_HOME="$HOME/.gradle"

SRC="/mnt/d/PROJECTS/pocketcodeapk/android"
WORK="$HOME/pocketcode-android"
TASKS=("${@:-:app:assembleDebug}")

mkdir -p "$WORK"
# --delete keeps the mirror honest when files are removed on the Windows side;
# build outputs are excluded so incremental state survives between runs.
rsync -a --delete \
  --exclude 'build/' --exclude '.gradle/' --exclude 'local.properties' \
  "$SRC/" "$WORK/"

cd "$WORK"
printf 'sdk.dir=%s\n' "$ANDROID_HOME" > local.properties

# The wrapper comes out of git with CRLF on Windows, which /bin/sh will not run.
sed -i 's/\r$//' gradlew
chmod +x gradlew

echo "[build] java: $(java -version 2>&1 | head -1)"
echo "[build] tasks: ${TASKS[*]}"
./gradlew --no-daemon "${TASKS[@]}"

APK="$WORK/app/build/outputs/apk/debug/app-debug.apk"
if [ -f "$APK" ]; then
  OUT="/mnt/d/PROJECTS/pocketcodeapk/android/app-debug.apk"
  cp "$APK" "$OUT"
  echo "[build] APK -> $OUT ($(du -h "$APK" | cut -f1))"
fi

echo "ANDROID_BUILD_DONE"
