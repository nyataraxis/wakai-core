# Content Package

Content schema, loaders, and versioning for Wakai Core.

## Content build pipeline

The build pipeline parses local KanjiVG SVGs and kradfile2 to generate a typed
content artifact for the game. Output lives at `data/generated/content.full.json`.

Inputs:
- `data/raw/kanjivg` (KanjiVG SVGs)
- `data/raw/kradfile2` (kradfile2 text)
- `packages/content/startSet.json` (starting atoms)

Build:
- `pnpm content:build`
- `pnpm content:all` (build + tests)

Environment overrides:
- `WAKAI_RAW_DIR` (default `data/raw` at repo root)
- `WAKAI_GENERATED_DIR` (default `data/generated` at repo root)

## Scripts

```bash
pnpm --filter @wakai-core/content build
pnpm --filter @wakai-core/content lint
```

## Entry points

- `src/index.ts`
- `src/schema.ts`
- `src/loader.ts`
- `src/defaultContent.ts`
- `src/versioning.ts`

## Dependencies

- `zod`
