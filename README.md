# Wakai Core

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
pnpm --filter @wakai-core/web dev
pnpm --filter @wakai-core/web build
pnpm --filter @wakai-core/web preview
```

Build output: `apps/web/dist`

### Mobile (Capacitor)

```bash
pnpm --filter @wakai-core/mobile build
pnpm --filter @wakai-core/mobile sync
pnpm --filter @wakai-core/mobile open:android
pnpm --filter @wakai-core/mobile open:ios
```

Uses the web build output from `apps/web/dist`.

### Desktop (Electron)

```bash
pnpm --filter @wakai-core/desktop build
pnpm --filter @wakai-core/desktop start
```

Uses the web build output from `apps/web/dist`.

## Packages

- `@wakai-core/core` shared fusion engine with progress model
- `@wakai-core/content` content schema and loaders
- `@wakai-core/platform` ads, IAP, analytics adapters with platform stubs
- `@wakai-core/ui` shared React UI components with CSS modules

## Hidden-kanji puzzles

The default web page is a stroke-subtraction puzzle with seven starter levels. The original fusion demo remains available at `#/fusion`.

```bash
pnpm generate:puzzles
```

This compiles exact KanjiVG stroke geometry and reviewed answer maps using the existing content index. It runs offline and produces reproducible level data; it does not guess visual answers from normalized components. See [the generator guide](packages/pipeline/README.md) to add glyphs or combine them into levels.

## Release tags

```bash
pnpm release:tag
```
