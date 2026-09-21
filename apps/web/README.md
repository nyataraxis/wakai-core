# Web App

Vite + React client for the hidden-kanji puzzle and Kanji Alchemy laboratory. This
is the primary application target and the source build for the mobile and desktop
wrappers. Hidden kanji is the default page; `#/fusion` loads the audited Alchemy
dataset with two-to-four-part merges, multiple results, hints, source details, and
local progress.

## Scripts

```bash
pnpm --filter @wakai-core/web dev
pnpm --filter @wakai-core/web build
pnpm --filter @wakai-core/web preview
pnpm --filter @wakai-core/web lint
```

## Entry points

- `src/main.tsx` app bootstrap
- `src/App.tsx` top-level UI
- `src/PuzzlePage.tsx` default hidden-kanji puzzle page (`/` or `#/puzzle`)
- `src/AlchemyPage.tsx` Alchemy laboratory (`#/fusion`, currently outside main navigation)

## Hidden kanji

Select whole strokes in the displayed glyph, then check the selection. Strokes stay in their original positions and can be reused. Required discoveries complete the level; bonus discoveries are optional. The complete source glyph always counts. In two-glyph levels, selecting a stroke in the other glyph starts a fresh selection.

500 bundled single-kanji levels feature complex glyphs with at least 12 strokes. The searchable browser displays 24 levels at a time. Normal progression unlocks the next level on completion. Settings → Unlock all levels · Dev mode opens the entire collection immediately; switching it off returns to an earned level without deleting discoveries. Restart clears the current puzzle's discoveries but keeps its earned campaign unlock.

Stroke controls work with pointer input or Tab followed by Enter/Space. Exact repeated answer variants, progressive hints, answer slots grouped by stroke count, and selection preview remain available. Metadata is optional; the generated campaign does not invent readings or meanings. Discoveries and settings are saved locally, with a session-only fallback if storage is unavailable. Run the web `test` script under Node 22.6+ to check persistence and progression.

Run `pnpm generate:puzzles` from the repository root after editing reviewed maps. See `../../packages/pipeline/README.md` for the generator and `../../data/puzzles/README.md` for geometry and attribution notes. Generated levels ship with the app and require no runtime API or dictionary.

## Build output

- `apps/web/dist`

## Local dev

1. Run `pnpm install --frozen-lockfile` at the repo root with pnpm 9.15.0.
2. Run `pnpm dev` at the root to build shared packages before starting Vite.

The build copies the committed data and attribution files into `public/data` and
type-checks before bundling. Relative assets support project subdirectories.
See the root README for the manual GitHub Pages workflow and `VITE_BASE_PATH`.

## Related packages

- `@wakai-core/core`
- `@wakai-core/content`
- `@wakai-core/platform`
- `@wakai-core/ui`
