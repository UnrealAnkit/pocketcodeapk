#!/usr/bin/env node
// Renders tools/pairing.local.json as a scannable PNG. The server prints an
// ASCII QR to its own terminal, which phones struggle to read off a scrolled
// terminal buffer -- this gives you an image you can open full-screen.
//
//   node tools/pairing-qr.js [--in pairing.local.json] [--out pairing-qr.png]

const fs = require('fs');
const path = require('path');

const here = __dirname;
const args = process.argv.slice(2);
const argOf = (flag, fallback) => {
  const i = args.indexOf(flag);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};

const inFile = path.resolve(here, argOf('--in', 'pairing.local.json'));
const outFile = path.resolve(here, argOf('--out', 'pairing-qr.png'));

let QRCode;
try {
  QRCode = require(path.join(here, '..', 'extension', 'node_modules', 'qrcode'));
} catch {
  QRCode = require('qrcode');
}

if (!fs.existsSync(inFile)) {
  console.error(`No pairing payload at ${inFile}. Start the server first: tools/wsl-serve.sh`);
  process.exit(1);
}

const raw = fs.readFileSync(inFile, 'utf8').trim();
let payload;
try {
  payload = JSON.parse(raw);
} catch (err) {
  console.error(`${inFile} is not valid JSON: ${err.message}`);
  process.exit(1);
}

if (typeof payload.exp === 'number' && payload.exp < Date.now()) {
  console.error(`Pairing token expired at ${new Date(payload.exp).toISOString()}. Restart the server.`);
  process.exit(1);
}

QRCode.toFile(outFile, raw, { width: 720, margin: 2, errorCorrectionLevel: 'M' })
  .then(() => {
    console.log(`url:  ${payload.url}`);
    if (payload.exp) console.log(`exp:  ${new Date(payload.exp).toISOString()}`);
    console.log(`wrote ${outFile}`);
  })
  .catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
