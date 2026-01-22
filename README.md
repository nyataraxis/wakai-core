# Kanji Alchemy

Web-first, mobile-first monorepo with a shared TypeScript core engine.

## Requirements

- Node.js 20+
- pnpm 9+

## Setup

```bash
pnpm install
```

## Root scripts

```bash
pnpm dev
pnpm build
pnpm test
pnpm lint
```

## Monorepo layout

- `apps/web` Vite + React web app
- `apps/mobile` Capacitor wrapper for the web build
- `apps/desktop` Electron wrapper for the web build
- `packages/core` core engine and progression logic
- `packages/content` content schema and loaders
- `packages/platform` platform adapters (ads, IAP, analytics)
- `packages/ui` shared React UI components

## Subproject READMEs

- `apps/web/README.md`
- `apps/mobile/README.md`
- `apps/desktop/README.md`
- `packages/core/README.md`
- `packages/content/README.md`
- `packages/platform/README.md`
- `packages/ui/README.md`

## Apps

### Web

```bash
pnpm --filter @kanji-alchemy/web dev
pnpm --filter @kanji-alchemy/web build
pnpm --filter @kanji-alchemy/web preview
```

Build output: `apps/web/dist`

### Mobile (Capacitor)

```bash
pnpm --filter @kanji-alchemy/mobile build
pnpm --filter @kanji-alchemy/mobile sync
pnpm --filter @kanji-alchemy/mobile open:android
pnpm --filter @kanji-alchemy/mobile open:ios
```

Uses the web build output from `apps/web/dist`.

### Desktop (Electron)

```bash
pnpm --filter @kanji-alchemy/desktop build
pnpm --filter @kanji-alchemy/desktop start
```

Uses the web build output from `apps/web/dist`.

## Packages

- `@kanji-alchemy/core` shared fusion engine with progress model
- `@kanji-alchemy/content` content schema and loaders
- `@kanji-alchemy/platform` ads, IAP, analytics adapters with platform stubs
- `@kanji-alchemy/ui` shared React UI components with CSS modules

## Release tags

```bash
pnpm release:tag
```
