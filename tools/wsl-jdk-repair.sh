#!/usr/bin/env bash
# Reinstall the JDK and prove it is intact before Gradle depends on it.
#
# A truncated or damaged download surfaces much later as
# "ClassFormatError: Incompatible magic value 0", because `java -version`
# never touches the affected module. Exercising the security provider chain
# here fails fast instead.
set -euo pipefail

JDK_DIR="$HOME/.local/jdk17"

echo "=== disk ==="
df -h "$HOME" | tail -1

rm -rf "$JDK_DIR" /tmp/jdk17.tar.gz
mkdir -p "$JDK_DIR"

echo "[jdk] downloading Temurin 17..."
curl -fSL --retry 3 --retry-delay 2 -o /tmp/jdk17.tar.gz \
  "https://api.adoptium.net/v3/binary/latest/17/ga/linux/x64/jdk/hotspot/normal/eclipse"

echo "[jdk] archive size: $(stat -c %s /tmp/jdk17.tar.gz) bytes"
echo "[jdk] verifying archive integrity..."
gzip -t /tmp/jdk17.tar.gz

tar -xzf /tmp/jdk17.tar.gz -C "$JDK_DIR" --strip-components=1
rm -f /tmp/jdk17.tar.gz

echo "[jdk] $("$JDK_DIR/bin/java" -version 2>&1 | head -1)"

echo "[jdk] exercising the security provider chain (the part that was broken)..."
cat > /tmp/JdkCheck.java <<'JAVA'
import java.security.MessageDigest;
public class JdkCheck {
    public static void main(String[] a) throws Exception {
        MessageDigest.getInstance("SHA-256").digest("ok".getBytes());
        Class.forName("javax.security.auth.login.Configuration");
        System.out.println("JDK_OK");
    }
}
JAVA
"$JDK_DIR/bin/java" /tmp/JdkCheck.java
rm -f /tmp/JdkCheck.java

echo "JDK_REPAIR_DONE"
