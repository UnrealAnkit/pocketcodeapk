#!/usr/bin/env bash
# Reinstalls Android SDK packages whose metadata was truncated.
#
# When C: filled up, sdkmanager finished unpacking each payload but wrote a
# zero-byte package.xml. Gradle reads those descriptors to resolve the compile
# classpath, so the build died on "UnmarshalException: Premature end of file"
# rather than on anything that pointed at the real problem.
set -euo pipefail

export JAVA_HOME="$HOME/.local/jdk17"
export PATH="$JAVA_HOME/bin:$PATH"
SDK_DIR="$HOME/.local/android-sdk"
SDKMANAGER="$SDK_DIR/cmdline-tools/latest/bin/sdkmanager"

echo "=== truncated descriptors before ==="
find "$SDK_DIR" -name package.xml -size 0 -print || true

# sdkmanager treats a package as installed purely on the presence of a valid
# package.xml, so drop the whole directory to force a genuine reinstall.
rm -rf "$SDK_DIR/platforms/android-35" \
       "$SDK_DIR/build-tools/35.0.0" \
       "$SDK_DIR/platform-tools"

yes | "$SDKMANAGER" --sdk_root="$SDK_DIR" --licenses > /dev/null 2>&1 || true
"$SDKMANAGER" --sdk_root="$SDK_DIR" \
  "platform-tools" "platforms;android-35" "build-tools;35.0.0" 2>&1 | tail -3

echo
echo "=== descriptors after ==="
bad=$(find "$SDK_DIR" -name package.xml -size 0 | wc -l)
find "$SDK_DIR" -name package.xml -printf '%s\t%p\n' | sort -n

if [ "$bad" -ne 0 ]; then
  echo "SDK_REPAIR_FAILED: $bad empty descriptor(s) remain"
  exit 1
fi
echo "SDK_REPAIR_DONE"
