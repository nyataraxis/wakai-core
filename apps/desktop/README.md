# Desktop App

Electron wrapper for the web build. The desktop app loads the web output from `apps/web/dist`.

## Scripts

```bash
pnpm --filter @kanji-alchemy/desktop dev
pnpm --filter @kanji-alchemy/desktop build
pnpm --filter @kanji-alchemy/desktop start
pnpm --filter @kanji-alchemy/desktop lint
```

## Workflow

1. Run the web dev server via `pnpm --filter @kanji-alchemy/desktop dev`.
2. Build the Electron main process with `pnpm --filter @kanji-alchemy/desktop build`.
3. Launch the app with `pnpm --filter @kanji-alchemy/desktop start`.

## Entry points

- `src/main.ts`
- `src/preload.ts`
