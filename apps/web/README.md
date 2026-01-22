# Web App

Vite + React web client for Kanji Alchemy. This is the primary application target and the source build for the mobile and desktop wrappers.

## Scripts

```bash
pnpm --filter @kanji-alchemy/web dev
pnpm --filter @kanji-alchemy/web build
pnpm --filter @kanji-alchemy/web preview
pnpm --filter @kanji-alchemy/web lint
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

- `@kanji-alchemy/core`
- `@kanji-alchemy/content`
- `@kanji-alchemy/platform`
- `@kanji-alchemy/ui`
