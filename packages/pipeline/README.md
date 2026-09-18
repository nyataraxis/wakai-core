# Content generation

The existing `generate` command builds the component indexes used by the alchemy sandbox. Stroke puzzles use a separate, deterministic offline compiler:

```sh
pnpm generate:puzzles
```

From the repository root, this builds the core and pipeline packages and writes `packages/content/src/puzzleLevels.json`. Generation needs no network access or complete KanjiVG checkout. Run `pnpm --filter @wakai-core/pipeline test` to check generation, source integrity, and reproducibility against the committed output.

## Puzzle inputs

- `data/generated/content.full.json` resolves each source character to its indexed KanjiVG filename.
- `data/puzzles/glyphs/` contains six exact KanjiVG SVG fixtures, including their upstream copyright headers.
- `data/puzzles/maps.json` contains reviewed glyph mappings and seven ordered level recipes. A variant lists whole, original KanjiVG stroke IDs. IDs are local to one source glyph.

The compiler verifies index references and SHA-256 digests, extracts the unchanged SVG paths and view box, adds each complete source glyph as a required answer, and merges repeated answer characters across sources. It preserves every reviewed variant, counts each character once, and promotes shared bonus answers to required when another source requires them. Finally, core `validatePuzzleLevel` rejects invalid or ambiguous selections. No timestamp, randomness, font lookup, or runtime recognition is involved.

The digest is calculated over the UTF-8 SVG text with CRLF converted to LF so that Git checkout settings do not invalidate a review. Other changes require updating the review and its digest. Transformed stroke paths are rejected: rendering must use the geometry that was reviewed.

## Adding levels

1. Choose a source present in the component index and copy its original SVG into the fixture directory, retaining attribution.
2. Review its exact stroke geometry. Add full stroke-ID subsets to a glyph entry, with readings/meaning when useful, and compute its digest with exported `glyphDigest`.
3. Add a level recipe with a stable ID, title, and ordered source characters. Existing glyph maps can be reused in multi-source recipes.
4. Regenerate, inspect the resulting glyph and every answer visually, then run the pipeline and core tests. Commit the reviewed input and generated output together.

Component indexes alone cannot establish valid visual subtraction: a radical may be altered, disconnected, or only a fragment of an independent character. The generator intentionally **does not turn normalized component labels into answers**. Its current seven levels are a reviewed starter catalog, not an exhaustive generator for arbitrary kanji. Broad automatic discovery would need a separate geometric candidate/review system.

The starter catalog uses kanji only. The data model supports kana for future bonus or special levels. Visually identical kanji/kana pairs (such as 口/ロ or 二/ニ) cannot both map to the same subset because exact-match submission would become ambiguous. No strokes cross source glyph boundaries.

See `data/puzzles/README.md` for fixture attribution and the shipped geometry review notes.
