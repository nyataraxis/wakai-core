# Web App

Vite + React web client for Wakai Core. This is the primary application target and the source build for the mobile and desktop wrappers.

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
- `src/FusionPage.tsx` original fusion demo (`#/fusion`)

## Hidden kanji

Select whole strokes in the displayed glyph, then check the selection. Strokes stay in their original positions and can be reused. Required discoveries complete the level; bonus discoveries are optional. The complete source glyph always counts. In two-glyph levels, selecting a stroke in the other glyph starts a fresh selection.

Seven bundled levels include repeated answer variants, progressively revealed hints, readings and meanings, answer slots grouped by stroke count, and a selection preview. Stroke controls work with pointer input or Tab followed by Enter/Space. Discoveries are saved per level and content version in local storage; unavailable storage falls back to the current visit. Restart clears only the current level.

Run `pnpm generate:puzzles` from the repository root after editing reviewed maps. See `../../packages/pipeline/README.md` for the generator and `../../data/puzzles/README.md` for geometry and attribution notes. Generated levels ship with the app and require no runtime API or dictionary.

## Build output

- `apps/web/dist`

## Local dev

1. Run `pnpm install` at the repo root.
2. Run `pnpm --filter @wakai-core/web... build` once to build its workspace dependencies.
3. Start the dev server with the `dev` script above.

## Related packages

- `@wakai-core/core`
- `@wakai-core/content`
- `@wakai-core/platform`
- `@wakai-core/ui`
