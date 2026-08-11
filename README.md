# PocketCode

Control your code editor from your phone.

PocketCode pairs an Android app with a desktop editor extension so you can open a real terminal, browse files, inspect Git changes, and watch agent activity from your phone without remoting your whole desktop.

## What PocketCode does

- Real terminal tabs backed by PTY sessions
- File tree browsing and file reads/writes
- Git status, diff, stage, commit, push, and branch flows
- Agent activity view for supported CLIs such as Claude Code and Codex CLI
- Approval prompts on mobile when an agent needs you
- QR-based pairing between phone and machine
- Multiple machine support inside the Android app
- Tunnel-based remote access for development setups that are not on the same local network

## Repo layout

- `android/` - Android app
- `extension/` - VS Code / Cursor extension and local session server
- `frontend/` - Next.js product website
- `docs/` - architecture and security notes
- `tools/` - local helper scripts and utilities

## Current requirements

- Android device on API 26+
- VS Code, Cursor, or another compatible editor host
- Node.js 18+
- Java 17 for the Android build
- Android SDK for APK builds
- At least one tunnel option when pairing remotely

## Tunnel options

PocketCode can be run with several tunnel providers depending on your setup.

- `devtunnel` - the default editor setting
- `tailscale`
- `tailscale-ip`
- `ssh`
- CLI and local testing also support `local`, `cloudflare`, and `ngrok`

## Quick start

### 1. Build the extension

```bash
cd extension
npm install
npm run build
npx vsce package
code --install-extension remotedev-pocketcode-*.vsix
```

### 2. Build and install the Android app

```bash
cd android
./gradlew :app:assembleDebug
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

### 3. Start a session

1. Open your project in VS Code or Cursor.
2. Run `RemoteDev: Start Mobile Session`.
3. Scan the pairing QR code in the PocketCode Android app.
4. Use the terminal, files, Git, and agent views from the phone.

## Editor settings

PocketCode currently exposes these main extension settings:

```json
{
  "remoteDev.preferredTunnel": "devtunnel",
  "remoteDev.tokenExpiryMinutes": 1440,
  "remoteDev.localPort": 0,
  "remoteDev.maxTerminals": 16,
  "remoteDev.sshTarget": "user@your-host.example.com",
  "remoteDev.sshRemotePort": 0
}
```

Use the SSH settings only when `remoteDev.preferredTunnel` is set to `ssh`.

## Notes for Windows

- The extension now uses a real Windows ConPTY-backed terminal path, so terminal UIs such as Claude Code and Codex CLI behave correctly in PocketCode.
- The Android terminal input path is tuned for raw terminal typing, which avoids mobile keyboard autocorrect/composing issues when sending commands.

## Frontend

The product site lives in `frontend/` and is built with Next.js.

```bash
cd frontend
npm install
npm run build
```

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [Security](docs/SECURITY.md)
- [Extension notes](extension/README.md)
- [Android notes](android/README.md)

## License

MIT
