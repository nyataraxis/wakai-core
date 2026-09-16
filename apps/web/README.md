# Web App

Vite + React Kanji Alchemy laboratory. This is the primary application target and
the source build for the mobile and desktop wrappers. It loads the audited
`data/generated/alchemy.json`, with two-to-four-part merges, multiple results,
playable hints, source details, and local progress.

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
