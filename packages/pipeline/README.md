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

# Audited KanjiVG compiler

The default CLI builds `data/generated/alchemy.json` and `audit.json` from the pinned KanjiVG checkout at `data/raw/kanjivg/kanji`. `data/source-lock.json` must match the checkout revision. Run the pipeline build, then `node packages/pipeline/dist/cli.js`; add `--check` to verify committed artifacts without writing them.

Only canonical hexadecimal SVG filenames representing Unicode unified ideographs enter the target corpus. This is the pinned KanjiVG corpus, not all Unicode kanji or a claim of complete Japanese dictionary coverage. Elements comprise those targets and usable named components from accepted recipes; rejected partial or opaque fragments are excluded. Source hashing uses sorted filenames, a NUL separator, UTF-8 XML with CRLF normalized to LF, and another NUL separator per file.

The parser retains every stroke ID. Named boundaries must cover all strokes exactly. Split groups are joined only when their element and optional instance number match, their part numbers form a unique sequence starting at one with at least two parts, and their variant/original metadata agrees. Partial groups and inconsistent splits are quarantined. Unnamed groups are transparent only when doing so loses no strokes. No shape, dictionary gloss, or missing stroke is invented.

Recipes use immediate named boundaries or bounded expansions of those same source boundaries, with two to four ingredients. Repeated ingredients are retained. Five or more ingredients are recorded as unavailable unless another source tree supplies a complete smaller recipe. Contextual variant internals are never projected into standalone characters. The small explicit shape alias table normalizes ingredient IDs and signatures consistently; it does not infer global equivalence from `original`, map 月 to 肉, or guess from kana resemblance. These are visual construction recipes, not etymological assertions. Different outputs sharing an unordered signature are all retained.

Atomic starters mean that the accepted source graph has no producing recipe; they do not assert that a character is linguistically indivisible. Missing strokes, incomplete annotations and unsupported arities are explicit reasons in the audit. A large starter set is an honest source limitation. Seed minimality is relative to literal element IDs in this exact accepted recipe graph, including alias-shaped source targets. The compiler starts with every element without a producer, adds deterministic cycle breakers, and removes any unnecessary added seeds. It claims an inclusion-minimal set, not a globally smallest set; an exact minimum is claimed only when all recipe dependencies are acyclic. Reachability witnesses give an executable recipe and depth for each nonstarter.

The output is a modified KanjiVG derivative under CC BY-SA 3.0. Preserve KanjiVG attribution, the upstream license, the pinned revision and transformation notes when redistributing data. Legacy exported helpers remain for compatibility but are not used by the audited CLI.
