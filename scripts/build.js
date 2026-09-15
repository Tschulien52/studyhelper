const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const sourceDir = path.join(root, 'src');
const target = process.argv.includes('--target') ? process.argv[process.argv.indexOf('--target') + 1] : 'chrome';
const outputDir = path.join(root, 'dist', target);

if (process.argv.includes('--clean')) {
  fs.rmSync(path.join(root, 'dist'), { recursive: true, force: true });
  process.exit(0);
}

if (!['chrome', 'safari'].includes(target)) throw new Error(`Unknown build target: ${target}`);
fs.rmSync(outputDir, { recursive: true, force: true });

function copySource(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const from = path.join(directory, entry.name);
    const relative = path.relative(sourceDir, from);
    const to = path.join(outputDir, relative);
    if (entry.isDirectory()) {
      fs.mkdirSync(to, { recursive: true });
      copySource(from);
    } else if (!entry.name.endsWith('.md') && entry.name !== 'manifest.json' && entry.name !== '.DS_Store') {
      fs.mkdirSync(path.dirname(to), { recursive: true });
      fs.copyFileSync(from, to);
    }
  }
}

function writeManifest() {
  if (target === 'chrome') {
    fs.copyFileSync(path.join(sourceDir, 'manifest.json'), path.join(outputDir, 'manifest.json'));
    return;
  }
  const manifest = JSON.parse(fs.readFileSync(path.join(sourceDir, 'manifest.json'), 'utf8'));
  // Older Safari converter versions reject background.type. The background
  // entry is bundled below into a classic, non-module service worker.
  manifest.background = { service_worker: 'background/background.js' };
  fs.writeFileSync(path.join(outputDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
}

function resolveImport(importer, request) {
  const resolved = path.resolve(path.dirname(importer), request);
  return path.extname(resolved) ? resolved : `${resolved}.js`;
}

function bundleModule(entry, visited = new Set()) {
  if (visited.has(entry)) return '';
  visited.add(entry);
  let source = fs.readFileSync(entry, 'utf8');
  const imports = [];
  source = source.replace(/import\s*(?:[^'";]+?)\s*from\s*['"]([^'"]+)['"]\s*;?/g, (_, request) => {
    imports.push(resolveImport(entry, request));
    return '';
  });
  source = source.replace(/export\s+(?=(?:(?:async)\s+)?(?:const|function|class|let|var)\b)/g, '');
  source = source.replace(/export\s*\{[^}]+\};?/g, '');
  return imports.map((dependency) => bundleModule(dependency, visited)).join('\n') + `\n${source}`;
}

copySource(sourceDir);
writeManifest();
if (target === 'safari') {
  const source = bundleModule(path.join(sourceDir, 'background', 'background.js'));
  fs.writeFileSync(path.join(outputDir, 'background', 'background.js'), `${source.trim()}\n`);
}
console.log(`Built ${outputDir}`);
