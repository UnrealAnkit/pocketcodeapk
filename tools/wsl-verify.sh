#!/usr/bin/env bash
# Confirms the WSL toolchain is intact.
#
# The ext4 root is mounted errors=remount-ro, so when the Windows C: drive
# filled up the filesystem silently went read-only mid-write. That left
# half-written files behind that still *look* present -- a corrupted JDK whose
# `java -version` worked fine but whose security classes were zero-filled. So
# check that things actually run, not merely that they exist.
set -uo pipefail

export PATH="$HOME/.local/bin:$PATH"
export JAVA_HOME="$HOME/.local/jdk17"
export ANDROID_HOME="$HOME/.local/android-sdk"

fails=0
check() {
  local name="$1"; shift
  if out=$("$@" 2>&1); then
    printf 'OK    %-22s %s\n' "$name" "$(printf '%s' "$out" | head -1)"
  else
    printf 'BROKE %-22s %s\n' "$name" "$(printf '%s' "$out" | head -2 | tr '\n' ' ')"
    fails=$((fails + 1))
  fi
}

echo "=== filesystem ==="
mount | grep -E ' / ' | grep -o 'rw\|ro' | head -1
df -h / | tail -1

echo
echo "=== toolchain ==="
check node "$HOME/.local/bin/node" -v
check npm "$HOME/.local/bin/npm" -v
check python3 python3 -V
check cloudflared "$HOME/.local/bin/cloudflared" --version
check java "$JAVA_HOME/bin/java" -version

# The failure mode that bit us: java starts, then dies loading a security class.
cat > /tmp/JdkCheck.java <<'JAVA'
import java.security.MessageDigest;
public class JdkCheck {
    public static void main(String[] a) throws Exception {
        MessageDigest.getInstance("SHA-256").digest("ok".getBytes());
        System.out.println("jdk security chain ok");
    }
}
JAVA
check jdk-security "$JAVA_HOME/bin/java" /tmp/JdkCheck.java
rm -f /tmp/JdkCheck.java

echo
echo "=== android sdk ==="
for p in "platforms/android-35" "build-tools/35.0.0" "platform-tools/adb"; do
  if [ -e "$ANDROID_HOME/$p" ]; then printf 'OK    %s\n' "$p"; else printf 'BROKE %s missing\n' "$p"; fails=$((fails + 1)); fi
done
check aapt2 "$ANDROID_HOME/build-tools/35.0.0/aapt2" version

echo
if [ "$fails" -eq 0 ]; then echo "VERIFY_OK"; else echo "VERIFY_FAILED ($fails)"; fi
exit "$fails"
