# Reviewed stroke puzzle sources

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
