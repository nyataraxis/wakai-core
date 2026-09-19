# Kanji Alchemy: model, evidence, and development plan

## Objective and scope

Build an alchemy game from a reproducible graph of written kanji components.
The MVP is a static React web app that can live under a GitHub Pages subdirectory.
Reuse the TypeScript core, package boundaries, Vite app, and existing test setup.
Keep mobile and desktop wrappers available for later work.

"Every kanji" needs a declared corpus. This version targets every canonical SVG
whose filename identifies a Unicode unified ideograph in the pinned KanjiVG
revision. It includes 6,423 kanji and 178 additional usable component forms. It
does not claim complete Unicode, Jōyō, readings, meaning, or etymological coverage.

## What the abandoned version could and could not do

The existing sorted ingredient signature preserved multiplicity and supported
arbitrary arity, so its basic approach was reusable. The monorepo already had
React, Vite, TypeScript, Vitest, content validation, and platform wrappers.

The old data was not a reliable game graph:

- It stored 6,702 entries and 413 starters, but literal closure reached only
  2,759 stored entries, leaving 3,943 unreachable.
- Its importer skipped strokes outside named groups. 本, 末, and 未 could each
  become a single 木 component with the remaining stroke unaccounted for.
- 105 decomposable outputs had no saved recipe because a signature could store
  only one output. Different spatial arrangements legitimately share a bag of parts.
- Runtime normalization changed 1,832 saved signatures, while the pipeline did
  not apply the same normalization when generating them.
- Variant SVGs could overwrite canonical forms; non-kanji letters, punctuation,
  and kana were mixed into the target corpus. Source revision and license
  attribution were not packaged with the generated outputs.
- The web app was a hardcoded water + fire → steam demo and did not load kanji data.

The old artifacts are retained as explicitly unverified legacy outputs. The
audited CLI replaces their use without silently laundering them into trusted data.

## Implementation stages and acceptance gates

1. **Audit and pin the source.** Select a finite target corpus; keep the source
   revision, aggregate SHA-256 digest, license, and exact file/node references.
   Regeneration must be deterministic and fail against a mismatched source.
2. **Compile complete decompositions.** Account for every stroke; preserve split
   component identity, multiplicity, local variants, and partial annotations.
   Reject unsupported candidates with reasons instead of inventing pieces.
3. **Construct and verify the game graph.** Keep all matching outputs, generate
   source-tree recipes of arity 2–4, compute starters, and replay an executable
   witness for every remaining element through the same engine used by the game.
4. **Build the web laboratory.** Four slots, click/drag controls, reusable pieces,
   all matching results, search, progressive inventory rendering, playable hints,
   source details, local saves, and clear failure/loading/reset states.
5. **Verify and prepare publication.** Unit regressions, real-data replay,
   reproducibility check, type checking, lint, desktop/mobile browser checks,
   and a production preview from a nested URL. Supply a manual Pages workflow.

## The data model

An element has a literal ID/glyph and is either a source target or an additional
component. A recipe contains an output, a multiset of two to four canonical input
IDs, original source forms, a deterministic signature, and a source SVG/node.
The signature index maps to **arrays** of outputs. Recipes retain the original
tree boundary; ingredient order is deliberately ignored by gameplay.

This means 木 + 口 may unlock 呆, 杏, and 束. It does not imply those characters
have the same spatial construction or etymology. The recipe detail links back to
the SVG so the structure can be inspected.

### Source normalization

KanjiVG is a stroke-order dataset with component annotations, not a perfect
decomposition dictionary. Its official [SVG format documentation](https://kanjivg.tagaini.net/svg-format.html)
distinguishes physical `element`, semantic `original`, separated `part` groups,
instance `number`, and incomplete `partial` groups.

The importer retains every path ID. Named component boundaries must cover all
strokes exactly. Unnamed groups can be transparent only if no strokes disappear.
Separated parts are joined only with consistent identities and complete,
unambiguous numbering. Partial or inconsistent groups are quarantined.

An explicit shape-alias table covers a small set such as 亻 → 人 and 氵 → 水.
It is used consistently by signatures, merging, and hints; hints substitute an
actually owned form. `original` is never mined into a global alias. In particular,
月 is not globally changed to 肉, 冫 is not changed to 氷, and kana resemblance is
not sufficient evidence. Contextual variant internals cannot become standalone
recipes for their canonical counterpart.

### Three and four ingredients

Keep immediate named components and explore bounded expansions of the same tree.
For example, 森 has 木 + 林 and 木 + 木 + 木. Repetition is significant, but a
discovered piece can be reused indefinitely. A four-part example in the real data
is 亠 + 口 + 冖 + 儿 → 亮.

Do not replace arbitrary subsets with a kanji that happens to use the same parts:
that erases source geometry. Do not add invisible or arbitrary binary intermediates
to force all recipes into two slots. A true five-way frontier such as 器 remains
a supplied starter in this MVP unless another complete source-backed recipe exists.

### Minimum starting set

The app offers freely switchable two-, three-, and four-piece modes with no
progress requirements to switch between them. Each mode uses only recipes with
exactly that many inputs and only the elements appearing in those recipes. Its starting set is recomputed
independently, so a form made in another mode can be a starter here when this mode
has no recipe producing it. Witnesses, counts, hints, and collection progress all
use the selected mode's graph. Progress is saved separately for each mode; the
previous mixed-mode save remains stored but is not loaded into these modes.

Compute the closure of all elements without producers. Add deterministic cycle
breakers only if necessary, then remove every unnecessary added seed. For general
cyclic graphs this guarantees an **inclusion-minimal** set, not a globally smallest
one. Acyclic graphs have a stronger certificate: every no-producer element must
be supplied, and those elements suffice. The current graph is acyclic.

Minimality is relative to collecting every literal ID in this accepted graph,
including source targets whose glyphs can also act as input aliases. It is not a
universal claim about the smallest possible kanji alphabet.

Every nonstarter includes a recipe witness and a strictly increasing dependency
depth. The verification script replays these through the real game engine and
checks every accepted recipe, rather than trusting summary counts.

### Progressive levels

Each merge mode now begins with 48 starters. Starters are ranked by how many
recipes use them, counting each starter once per recipe even when an ingredient
repeats. Codepoint ordering breaks ties deterministically. Each subsequent level
adds up to 20 starters, keeping every previous starter and discovery available.
The mode switcher remains freely accessible; levels advance independently within
each mode.

Unlock milestones use cumulative unique discoveries, excluding supplied starters:
20 discoveries unlock level 2, 40 unlock level 3, and so on. Each milestone is
capped by the current level's reachable discoveries so progression cannot require
an unavailable result. The final level's target is the complete discoverable
collection. Players choose when to advance after meeting a milestone; they do not
need to exhaust a level's recipes. Discovered intermediates remain reusable in
later recipes and levels.

The initial pools support 485, 493, and 273 discoveries in two-, three-, and
four-piece modes respectively, including 473, 475, and 268 kanji. Later levels
expand the available recipe graph until the complete mode is reachable. Most
results are terminal kanji; the existing four-piece graph in particular has fewer
reusable intermediates than the two-piece graph.

The collection offers per-level groups and a building-block filter for pieces
that participate in further recipes. Guided level progress uses a separate save
for each mode. Earlier sandbox saves remain stored but are not loaded into guided
progress, so a prior large inventory does not bypass the new starting set.

Real-data verification checks each level's cumulative closure, starter batches,
achievable discovery targets, advancement, retained discoveries, and complete
final reachability in addition to the existing full recipe replay.

## Current generated result

| Measure | Count |
| --- | ---: |
| Source-covered kanji | 6,423 |
| Additional components | 178 |
| Total reachable forms | 6,601 |
| Required starting pieces | 790 |
| Discoverable forms | 5,811 |
| Two-part recipes | 5,327 |
| Three-part recipes | 3,139 |
| Four-part recipes | 1,766 |
| Total recipes | 10,232 |

The large starting set is a visible limitation of conservative source coverage.
"Atomic" means no accepted producing recipe, not linguistically indivisible.
The app introduces these starters gradually in levels and offers playable hints
instead of expecting a new player to browse the complete starting set.

## Reproducibility, packaging, and verification

`data/source-lock.json` pins the upstream revision and digest. Hash input is sorted
canonical filenames plus NUL, LF-normalized UTF-8 XML plus NUL. Both source and
generated artifact comparisons normalize Windows line endings.

`pnpm data:fetch`, `pnpm generate`, and `pnpm data:check` are separate operations.
Ordinary builds use committed generated data and do not download dictionaries.
CI also regenerates from the pinned source and compares the artifacts. Web build
caching includes the root data, attribution files, copy script, and base-path
environment variable, so a data update cannot leave an old cached site.

`pnpm verify` builds the packages/web, runs unit tests and lint, validates the
bundle's references/signatures/index/witnesses/counts, and replays all discoveries.
Regression cases cover missing strokes, split enclosures, partial forms, unsafe
aliases, multiplicity, multi-output collisions, cycles, locked pieces, hint alias
substitution, duplicate discovery, and corrupted/outdated saves.

The web app uses localStorage with recovery and an in-app reset confirmation.
Saved progress is scoped by content version; incompatible future recipe-model
changes must bump that version. It is not a cloud save. The service worker caches
the application and recipes after an online visit. The larger audit file is
downloadable but is not included in the initial offline precache.

The data is an adaptation of [KanjiVG](https://github.com/KanjiVG/kanjivg), copyright
Ulrich Apel and contributors, distributed under CC BY-SA 3.0. Attribution, license,
revision, digest, and transformation notes ship with the web build.

## Next steps after playing the MVP

The next valuable work is reducing **specific** opaque starters, not adding more
unreviewed recipes. Rank audit gaps by usage and Japanese learning relevance; add
a small reviewed override layer with an explanation, source citation, stroke
coverage, and a regression fixture for every exception. Evaluate a Japanese-form
IDS source as corroborating evidence, with its own version and license, rather
than merging dictionaries by global character substitutions.

The current frequency-ranked levels can later be refined into thematic groups
with their own closure certificates. Add licensed readings/meanings and a declared
Jōyō target list before calling this a learning dictionary. Spatial recipe
visualization and synthetic intermediate components are later product decisions,
not hidden repairs to missing data.
