#!/usr/bin/env node
// Bundles xterm assets into a single self-contained HTML file
// for React Native WebView loading.
//
// Usage: node scripts/bundle-xterm.js

const fs = require('fs');
const path = require('path');

const assetsDir = path.join(__dirname, '..', 'assets', 'xterm');
const outDir = path.join(__dirname, '..', 'assets', 'xterm', 'bundled');

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

const html = fs.readFileSync(path.join(assetsDir, 'terminal.html'), 'utf-8');
const xtermJs = fs.readFileSync(path.join(assetsDir, 'xterm.js'), 'utf-8');
const addonFitJs = fs.readFileSync(path.join(assetsDir, 'addon-fit.js'), 'utf-8');
const xtermCss = fs.readFileSync(path.join(assetsDir, 'xterm.css'), 'utf-8');

const bundled = html
  .replace('<link rel="stylesheet" href="xterm.css">', `<style>${xtermCss}</style>`)
  .replace('<script src="xterm.js"></script>', `<script>${xtermJs}</script>`)
  .replace('<script src="addon-fit.js"></script>', `<script>${addonFitJs}</script>`);

fs.writeFileSync(path.join(outDir, 'terminal.html'), bundled, 'utf-8');

console.log(`Bundled terminal.html (${(bundled.length / 1024).toFixed(1)} KB)`);
