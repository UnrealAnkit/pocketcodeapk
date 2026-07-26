#!/usr/bin/env python3
"""Confirms the brand assets actually made it into the packaged APK."""
import sys
import zipfile

apk = sys.argv[1] if len(sys.argv) > 1 else "/mnt/d/PROJECTS/pocketcodeapk/android/app-debug.apk"
z = zipfile.ZipFile(apk)

fonts = [n for n in z.namelist() if n.endswith(".ttf") or "/font" in n]
print("fonts packaged: %d" % len(fonts))
for n in sorted(fonts):
    print("  %-46s %8d bytes" % (n, z.getinfo(n).file_size))

total = sum(i.file_size for i in z.infolist())
print("\nentries: %d, uncompressed total: %.1f MB" % (len(z.infolist()), total / 1e6))
