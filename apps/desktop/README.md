# Desktop App

Electron wrapper for the web build. The desktop app loads the web output from `apps/web/dist`.

## Scripts

```bash
pnpm --filter @wakai-core/desktop dev
pnpm --filter @wakai-core/desktop build
pnpm --filter @wakai-core/desktop start
pnpm --filter @wakai-core/desktop lint
```

## Workflow

1. Run the web dev server via `pnpm --filter @wakai-core/desktop dev`.
2. Build the Electron main process with `pnpm --filter @wakai-core/desktop build`.
3. Launch the app with `pnpm --filter @wakai-core/desktop start`.

## Entry points

- `src/main.ts`
- `src/preload.ts`
