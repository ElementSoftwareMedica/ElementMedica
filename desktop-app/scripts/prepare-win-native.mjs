import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const root = dirname(dirname(fileURLToPath(import.meta.url)));
const electronVersion = require('electron/package.json').version;
const sqliteDir = join(root, 'node_modules', 'better-sqlite3');
const prebuildInstall = join(root, 'node_modules', '.bin', process.platform === 'win32' ? 'prebuild-install.cmd' : 'prebuild-install');

if (!existsSync(sqliteDir)) {
  throw new Error(`better-sqlite3 non trovato: ${sqliteDir}`);
}

if (!existsSync(prebuildInstall)) {
  throw new Error(`prebuild-install non trovato: ${prebuildInstall}`);
}

const result = spawnSync(prebuildInstall, [
  '-r',
  'electron',
  '-t',
  electronVersion,
  '--platform',
  'win32',
  '--arch',
  'x64',
], {
  cwd: sqliteDir,
  stdio: 'inherit',
});

if (result.status !== 0) {
  throw new Error(`Preparazione native module Windows fallita con exit code ${result.status}`);
}
