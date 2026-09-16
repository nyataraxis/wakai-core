import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { compileAudited, parseAuditedSvg } from './audited.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const sourceDir = path.join(root, 'data/raw/kanjivg');
const kanjiDir = path.join(sourceDir, 'kanji');
const outputDir = path.join(root, 'data/generated');
const revision = execFileSync('git', ['-C', sourceDir, 'rev-parse', 'HEAD'], {
  encoding: 'utf8'
}).trim();
const lock: unknown = JSON.parse(fs.readFileSync(path.join(root, 'data/source-lock.json'), 'utf8'));
if (
  typeof lock !== 'object' ||
  lock === null ||
  !('revision' in lock) ||
  lock.revision !== revision
) {
  throw new Error(
    'KanjiVG checkout does not match data/source-lock.json; fetch the pinned source revision'
  );
}
const files = fs
  .readdirSync(kanjiDir)
  .filter((file) => {
    if (!/^[0-9a-f]{5,6}\.svg$/.test(file)) return false;
    return /^\p{Unified_Ideograph}$/u.test(String.fromCodePoint(Number.parseInt(file, 16)));
  })
  .sort();
const digest = createHash('sha256');
console.log(`Reading ${files.length} canonical ideographs from KanjiVG ${revision}`);
const trees = files.map((file, index) => {
  const xml = fs.readFileSync(path.join(kanjiDir, file), 'utf8').replace(/\r\n/g, '\n');
  digest.update(file).update('\0').update(xml).update('\0');
  if (index > 0 && index % 1000 === 0) console.log(`Parsed ${index}/${files.length} source files`);
  return parseAuditedSvg(xml, file);
});
console.log('Compiling stroke-complete recipes and proving reachability');
const sha256 = digest.digest('hex');
if (!('sha256' in lock) || lock.sha256 !== sha256) {
  throw new Error('KanjiVG source files do not match the pinned source digest');
}
const result = compileAudited(trees, {
  name: 'KanjiVG',
  url: 'https://github.com/KanjiVG/kanjivg',
  revision,
  license: 'CC-BY-SA-3.0',
  sha256
});
const check = process.argv.includes('--check');
if (!check) fs.mkdirSync(outputDir, { recursive: true });
for (const [name, value] of [
  ['alchemy.json', result.bundle],
  ['audit.json', result.audit]
] as const) {
  const target = path.join(outputDir, name);
  const generated = `${JSON.stringify(value, null, 2)}\n`;
  if (check) {
    if (
      !fs.existsSync(target) ||
      fs.readFileSync(target, 'utf8').replace(/\r\n/g, '\n') !== generated
    ) {
      throw new Error(`${name} is stale; regenerate the pinned source before committing`);
    }
  } else fs.writeFileSync(target, generated);
}
console.log(JSON.stringify(result.bundle.stats, null, 2));
