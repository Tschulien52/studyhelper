const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const projectDir = path.join(root, 'safari');
const extensionDir = path.join(root, 'dist', 'safari');

if (!fs.existsSync(extensionDir)) {
  throw new Error('dist/safari is missing. Run `npm run build:safari` first.');
}

fs.mkdirSync(projectDir, { recursive: true });
const result = spawnSync('xcrun', [
  'safari-web-extension-converter', extensionDir,
  '--project-location', projectDir,
  '--app-name', 'Angry Study Helper',
  // The converter uses this value for the extension and derives the
  // containing app identifier from the app name. Passing the derived app ID
  // keeps the embedded extension identifier properly prefixed.
  '--bundle-identifier', 'com.angrystudyhelper.Angry-Study-Helper',
  '--macos-only', '--no-open', '--no-prompt', '--force', '--copy-resources'
], { stdio: 'inherit' });

if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status ?? 1);
