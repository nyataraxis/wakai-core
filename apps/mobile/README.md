# Mobile App

Capacitor wrapper for the web build. The mobile project uses the web app output from `apps/web/dist`.

## Scripts

```bash
pnpm --filter @kanji-alchemy/mobile build
pnpm --filter @kanji-alchemy/mobile sync
pnpm --filter @kanji-alchemy/mobile open:android
pnpm --filter @kanji-alchemy/mobile open:ios
pnpm --filter @kanji-alchemy/mobile lint
```

## Workflow

1. Build the web app with `pnpm --filter @kanji-alchemy/mobile build`.
2. Sync native projects with `pnpm --filter @kanji-alchemy/mobile sync`.
3. Open the native IDE with `open:android` or `open:ios`.

## Config

- `capacitor.config.ts`
