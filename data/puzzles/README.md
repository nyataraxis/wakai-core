# Hidden Kanji puzzle sources

## 500-level campaign

`campaign.json` defines 500 distinct single-kanji levels from the KanjiVG revision
in `data/source-lock.json`. `campaign-glyphs/` holds their unmodified source SVGs,
including original copyright notices. The manifest pins each file's SHA-256 digest.
These assets, the derived mappings, audit, and generated level geometry are KanjiVG
adaptations under CC BY-SA 3.0, copyright Ulrich Apel and contributors.

Run `pnpm generate:puzzles` to compile the bundled campaign offline. To rebuild the
catalog selection, run `pnpm data:fetch`, `pnpm catalog:puzzles`, then
`pnpm generate:puzzles`. Catalog generation requires the detached pinned checkout.

Every selected glyph has at least 12 strokes and two common hidden kanji in addition
to the full source. A fixed featured list opens with intricate characters; remaining
sources rank deterministically by required-answer count, stroke count, and code point.
There are no repeated-source filler levels or multi-glyph combinations.

Answers use complete named KanjiVG groups with unchanged stroke paths. Partial,
split, marked variant, component-only, and noncanonical stroke-count groups are
rejected. No radical normalization or cross-group shape inference is used. Repeated
instances are accepted as alternate selections. A curated common-character list
defines required answers; other eligible kanji are bonuses. `campaign-audit.json`
records the canonical counts and rejected groups for selected glyphs.

This is an automatically source-mapped catalog, not 500 individually reviewed or
exhaustive visual puzzles. KanjiVG annotations establish the accepted subsets;
unannotated visual discoveries can be missing. Further human-reviewed subsets can
be added to the manifest. Rebuilding the catalog replaces such edits, so preserve
them separately before running `catalog:puzzles`.

## Original reviewed fixtures

The SVG fixtures in `glyphs/` are copied without modification from KanjiVG, copyright © 2009/2010/2011 Ulrich Apel and contributors. KanjiVG: https://kanjivg.tagaini.net/ . Upstream source: https://github.com/KanjiVG/kanjivg/tree/master/kanji .

The fixtures, their extracted stroke geometry in `packages/content/src/puzzleLevels.json`, and the derived stroke maps in `maps.json` are distributed under Creative Commons Attribution-ShareAlike 3.0: https://creativecommons.org/licenses/by-sa/3.0/ . Every SVG retains its original copyright and license notice. The fixture digest in each map pins the exact copied version rather than following upstream changes.

## Review notes

Mappings select whole SVG paths; folded paths such as the top and right edge of 田 remain a single inseparable stroke. No path is moved, shortened, joined, mirrored, or inferred from a normalized radical.

| Source           | Required subsets in addition to the full source                               | Bonus subsets |
| ---------------- | ----------------------------------------------------------------------------- | ------------- |
| 木 / `06728.svg` | 十: 1,2; 一: 1                                                                | —             |
| 王 / `0738b.svg` | 三: 1,3,4; 二: each horizontal pair; 一: each horizontal; 土: 2,3,4           | 干: 1,2,3     |
| 田 / `07530.svg` | 日: 1,2,4,5; 口: 1,2,5; 十: 3,4; 一: 4 or 5                                   | —             |
| 明 / `0660e.svg` | 日: 1–4; 月: 5–8; 口: 1,2,4; 一: 3,4,7,8 separately; 二: 3,4 or 7,8           | —             |
| 休 / `04f11.svg` | 木: 3–6; 十: 3,4; 一: 3                                                       | —             |
| 森 / `068ee.svg` | 林: 5–12; 木: 1–4, 5–8, or 9–12; 十: 1,2 or 5,6 or 9,10; 一: 1,5,9 separately | —             |

Here, a range means the contiguous inclusive set of stroke IDs; commas inside a subset mean simultaneous selection. The machine-readable manifest lists all IDs explicitly.

The 明休 recipe merges discoveries from the two separate glyphs. It does not assert that this pair is a Japanese word. A shared 一 counts once and accepts any of its five instances. 森 similarly accepts all three visible 木 instances, including the shortened right stroke of the lower-left tree, exactly as present in this fixed glyph.

The catalog is deliberately finite. A geometry review is required before adding further valid-looking subsets; changing glyph assets without updating the digest fails generation.
