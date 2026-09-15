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
  '--bundle-identifier', 'com.angrystudyhelper.safari',
  '--macos-only', '--no-open', '--no-prompt', '--force', '--copy-resources'
], { stdio: 'inherit' });

if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status ?? 1);
