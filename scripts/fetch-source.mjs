import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = new URL('../', import.meta.url);
const lock = JSON.parse(readFileSync(new URL('data/source-lock.json', root), 'utf8'));
const destination = fileURLToPath(new URL('data/raw/kanjivg', root));
if (!existsSync(destination)) {
  execFileSync('git', ['init', destination], { stdio: 'inherit' });
  execFileSync('git', ['-C', destination, 'remote', 'add', 'origin', lock.repository], {
    stdio: 'inherit'
  });
}
const git = (args) =>
  execFileSync('git', ['-C', destination, ...args], { encoding: 'utf8' }).trim();
if (git(['status', '--porcelain']))
  throw new Error('The raw source checkout has local edits; preserve them before fetching.');
execFileSync('git', ['-C', destination, 'fetch', '--depth', '1', lock.repository, lock.revision], {
  stdio: 'inherit'
});
execFileSync('git', ['-C', destination, 'checkout', '--detach', lock.revision], {
  stdio: 'inherit'
});
if (git(['rev-parse', 'HEAD']) !== lock.revision)
  throw new Error('Source revision does not match lock');
console.log(`KanjiVG pinned at ${lock.revision}`);
