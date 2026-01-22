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

## Build output

- `apps/web/dist`

## Local dev

1. Run `pnpm install` at the repo root.
2. Start the dev server with the `dev` script above.

## Related packages

- `@wakai-core/core`
- `@wakai-core/content`
- `@wakai-core/platform`
- `@wakai-core/ui`
