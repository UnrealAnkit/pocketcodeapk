# Running PocketCode from Windows

The server side needs a real PTY, and `extension/src/pty/manager.ts` only creates
one on macOS and Linux — on Windows it falls back to a bare piped shell, which no
agent CLI can drive. So everything server-side runs inside WSL. The Windows side
just holds the source and, if you want it, `adb`.

Sources stay on `D:\PROJECTS\pocketcodeapk`; WSL reads them through `/mnt/d`.

## One-time setup

```bash
wsl -d Ubuntu -- bash /mnt/d/PROJECTS/pocketcodeapk/tools/wsl-setup.sh          # node + cloudflared
wsl -d Ubuntu -- bash /mnt/d/PROJECTS/pocketcodeapk/tools/wsl-android-setup.sh  # JDK 17 + Android SDK 35
```

Both install into `~/.local` and need no sudo. Delete `~/.local/{node,jdk17,android-sdk}`
to undo.

> The scripts live on an NTFS mount and get CRLF endings, which `bash` will not
> run. Every invocation below is prefixed with a `sed` that strips them; if you
> run one directly and see `$'\r': command not found`, that is why.

## Daily loop

```bash
# extension: build + unit tests
wsl -d Ubuntu -- bash /mnt/d/PROJECTS/pocketcodeapk/tools/wsl-test.sh

# start the server + a public Cloudflare tunnel, print the pairing QR
wsl -d Ubuntu -- bash /mnt/d/PROJECTS/pocketcodeapk/tools/wsl-serve.sh

# end-to-end check against that running server (stands in for the phone)
wsl -d Ubuntu -- bash /mnt/d/PROJECTS/pocketcodeapk/tools/wsl-smoke.sh

# re-render the pairing QR as tools/pairing-qr.png, to open full-screen
wsl -d Ubuntu -- bash /mnt/d/PROJECTS/pocketcodeapk/tools/wsl-qr.sh

# build the debug APK -> android/app-debug.apk
wsl -d Ubuntu -- bash /mnt/d/PROJECTS/pocketcodeapk/tools/wsl-android-build.sh
```

**Leave the `wsl-serve.sh` terminal open.** WSL shuts a distro down once its last
process exits, so backgrounding the server with `nohup ... &` and letting the
launching shell return kills it a moment later — the tunnel then answers with a
Cloudflare 530 and `/tmp` is empty on the next run, because the distro rebooted.
Give it its own window for the duration of the demo.

`wsl-serve.sh` mirrors the pairing payload into `tools/pairing.local.json`, which
is what `wsl-smoke.sh` and `wsl-qr.sh` read. That file holds a live token and is
gitignored, as is the PNG rendered from it.

Cloudflare quick tunnels need no account, which is why they are the default. Pass
a second argument to pick another provider:
`wsl-serve.sh /mnt/d/PROJECTS/pocketcodeapk ngrok`.

## Installing the APK

`adb` comes with the SDK, but WSL cannot see USB devices. Either copy
`android\app-debug.apk` to the phone and open it, or use Windows `adb` over
wireless debugging.

## When something breaks

`tools/wsl-verify.sh` checks that each tool actually *runs* rather than merely
existing:

```bash
wsl -d Ubuntu -- bash /mnt/d/PROJECTS/pocketcodeapk/tools/wsl-verify.sh
```

This matters because of one specific failure. WSL's ext4 root is mounted
`errors=remount-ro`. When the Windows `C:` drive fills up, the virtual disk
cannot grow, the filesystem flips to read-only mid-write, and files are left
truncated but present. The symptoms are wildly misleading:

| Symptom | Actual cause |
|---|---|
| `ClassFormatError: Incompatible magic value 0` | truncated JDK, `java -version` still worked |
| `UnmarshalException: Premature end of file` | zero-byte `package.xml` in the Android SDK |
| `ClassNotFoundException: org.gradle.launcher.GradleMain` | truncated Gradle distribution |
| `Bus error`, `getpwnam failed`, distro will not start | the read-only root |

So check free space on `C:` first — not on `D:`, and not `df` inside WSL, which
reports the virtual disk's nominal size and looks fine.

```powershell
Get-Volume -DriveLetter C | Select-Object @{n='FreeGB';e={[math]::Round($_.SizeRemaining/1GB,2)}}
```

Repair scripts, in the order you would reach for them:

```bash
tools/wsl-jdk-repair.sh   # reinstall the JDK, then prove the security chain loads
tools/wsl-sdk-repair.sh   # reinstall SDK packages with zero-byte descriptors
rm -rf ~/.gradle          # Gradle caches; they re-download
```
