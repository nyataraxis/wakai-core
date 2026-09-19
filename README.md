# Kanji Alchemy / Wakai Core

A web app for discovering kanji through two complementary game modes. The default
hidden-kanji mode asks players to remove strokes from fixed glyphs, while the
Alchemy laboratory combines written components. The audited Alchemy dataset has
6,423 source-covered kanji, 6,601 elements, and 10,232 recipes with two to four
ingredients. All included forms are reachable from 790 starting pieces.

The starting set is a proven minimum **for the accepted recipe graph**, not a claim
about universal radicals. Characters without a complete supported decomposition
are supplied as starting pieces and identified in the audit. The corpus does not
claim to include every Unicode kanji or to be an expert-validated dictionary.

Read the [design and development plan](docs/kanji-alchemy.md) for the Alchemy
audit, model decisions, acceptance checks, and next steps. Hidden-kanji levels use
the reviewed maps under `data/puzzles`; Alchemy uses `data/generated/alchemy.json`.

## Requirements

- Node.js 22+
- pnpm 9.15.0 (the version in `packageManager`)

## Setup

```bash
pnpm install --frozen-lockfile
pnpm dev
```

The generated dataset is committed, so normal development needs no dictionary download.
`pnpm dev` builds the shared dependencies and starts the web app. The hidden-kanji
page is the default. Open `#/fusion` for Alchemy, where pieces can be clicked or
dragged into up to four reusable slots. Both modes save progress in the browser.

```bash
pnpm verify       # web build, package tests/lint, and full gameplay reachability
pnpm data:fetch   # fetch the exact KanjiVG revision (network required)
pnpm generate     # rebuild data from the pinned source and digest
pnpm data:check   # compare a fresh generation with committed artifacts
pnpm generate:puzzles # rebuild reviewed hidden-kanji levels
```

## GitHub Pages

The build uses relative assets and can live at `/wakai-core/` or another subdirectory.
The **Deploy Kanji Alchemy to Pages** workflow is manually triggered. After pushing
these changes, set the repository's Settings → Pages source to **GitHub Actions**,
then run that workflow. It verifies and publishes `apps/web/dist`. Nothing is
published by local development commands. Deployment replaces that repository's
Pages artifact; to include this in a larger existing site, copy the build into the
desired subdirectory of that site's own deployment instead.

To preview the production build at a project path in PowerShell:

```powershell
pnpm verify
$env:VITE_BASE_PATH = '/wakai-core/'
pnpm --filter @wakai-core/web preview --host 127.0.0.1
```

The source data is adapted from KanjiVG by Ulrich Apel and contributors under
CC BY-SA 3.0; see [attribution](data/NOTICE.md) and [license](data/KANJIVG-LICENSE.txt).
The service worker caches the app and recipe dataset after a successful online
visit. Progress is local to the browser; it is not an account or cloud backup.

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
