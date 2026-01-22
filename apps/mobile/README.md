# Mobile App

Capacitor wrapper for the web build. The mobile project uses the web app output from `apps/web/dist`.

## Scripts

```bash
pnpm --filter @wakai-core/mobile build
pnpm --filter @wakai-core/mobile sync
pnpm --filter @wakai-core/mobile open:android
pnpm --filter @wakai-core/mobile open:ios
pnpm --filter @wakai-core/mobile lint
```

## Workflow

1. Build the web app with `pnpm --filter @wakai-core/mobile build`.
2. Sync native projects with `pnpm --filter @wakai-core/mobile sync`.
3. Open the native IDE with `open:android` or `open:ios`.

## Config

- `capacitor.config.ts`
