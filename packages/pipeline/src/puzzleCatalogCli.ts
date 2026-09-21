import { copyFileSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { parseAuditedSvg, type AuditedNode } from './audited.js';
import { deriveCampaignGlyph, selectCampaign, type CampaignCandidate } from './puzzleCampaign.js';

const root = resolve(import.meta.dirname, '../../..');
const source = resolve(root, 'data/raw/kanjivg/kanji');
const lock: { revision: string; sha256: string } = JSON.parse(
  readFileSync(resolve(root, 'data/source-lock.json'), 'utf8')
);
if (readFileSync(resolve(source, '../.git/HEAD'), 'utf8').trim() !== lock.revision)
  throw new Error('Run data:fetch first: source must be detached at the pinned revision');
const files = readdirSync(source)
  .filter(
    (file) =>
      /^[0-9a-f]{5,6}\.svg$/.test(file) &&
      /^\p{Unified_Ideograph}$/u.test(String.fromCodePoint(Number.parseInt(file, 16)))
  )
  .sort();
const paths = (node: AuditedNode): number =>
  node.paths.length + node.children.reduce((sum, child) => sum + paths(child), 0);
const counts = new Map<string, number>();
const svgs = new Map<string, string>();
const rejectedSources: { file: string; reason: string }[] = [];
const digest = createHash('sha256');
for (const file of files) {
  const svg = readFileSync(resolve(source, file), 'utf8');
  digest.update(file).update('\0').update(svg.replace(/\r\n/g, '\n')).update('\0');
  try {
    const parsed = parseAuditedSvg(svg, file);
    counts.set(parsed.kanji, paths(parsed.tree));
    svgs.set(file, svg);
  } catch (error) {
    rejectedSources.push({ file, reason: error instanceof Error ? error.message : String(error) });
  }
}
if (digest.digest('hex') !== lock.sha256)
  throw new Error('KanjiVG source files do not match the pinned source digest');
const candidates: CampaignCandidate[] = [];
for (const [file, svg] of svgs) {
  try {
    candidates.push(deriveCampaignGlyph(file, svg, counts));
  } catch (error) {
    rejectedSources.push({ file, reason: error instanceof Error ? error.message : String(error) });
  }
}
const selected = selectCampaign(candidates);
const destination = resolve(root, 'data/puzzles/campaign-glyphs');
mkdirSync(destination, { recursive: true });
for (const entry of selected)
  copyFileSync(resolve(source, entry.glyph.svgFile), resolve(destination, entry.glyph.svgFile));
writeFileSync(
  resolve(root, 'data/puzzles/campaign.json'),
  `${JSON.stringify(
    {
      source: lock,
      policy:
        'Single glyphs, at least 12 strokes and two common proper subsets. Exact named KanjiVG groups only; no radical normalization or split-group inference.',
      glyphs: selected.map((entry) => entry.glyph),
      levels: selected.map(({ glyph }) => ({
        id: `kanji-${glyph.svgFile.slice(0, -4)}`,
        title: glyph.character,
        sources: [glyph.character]
      }))
    },
    null,
    2
  )}\n`
);
writeFileSync(
  resolve(root, 'data/puzzles/campaign-audit.json'),
  `${JSON.stringify(
    {
      source: lock,
      candidates: candidates.length,
      selected: selected.length,
      canonicalStrokeCounts: Object.fromEntries(
        [...counts].sort(([a], [b]) => a.codePointAt(0)! - b.codePointAt(0)!)
      ),
      rejectedSources,
      rejectedGroups: selected.flatMap((entry) =>
        entry.rejected.map((rejection) => ({ file: entry.glyph.svgFile, ...rejection }))
      )
    },
    null,
    2
  )}\n`
);
console.log(
  `Selected ${selected.length} complex single-kanji puzzles from ${candidates.length} source glyphs.`
);
