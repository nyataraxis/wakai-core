# Core Engine

Shared TypeScript engine that drives progression and fusion logic.

The web app uses `mergeAlchemy` and `getCraftableRecipes` from `src/alchemy.ts`.
They share normalization and ownership rules, preserve duplicate ingredients,
accept two to four slots, and return every output matching an unordered recipe.
Progress serialization filters unknown IDs, restores starters, and isolates
incompatible content versions. The old single-result `fuse` API remains available
for existing callers; it also validates ingredient ownership.

## Scripts

```bash
pnpm --filter @wakai-core/core build
pnpm --filter @wakai-core/core test
pnpm --filter @wakai-core/core lint
```

## Entry points

- `src/index.ts`
- `src/engine.ts`

## Tests

- `tests/engine.test.ts`
