# Content Package

Content schema, loaders, and versioning for Wakai Core.

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
- `src/puzzles.ts` runtime shape and invariant validation for puzzle bundles
- `src/puzzleLevels.json` deterministic generated starter levels

`getPuzzleContent()` loads the bundled puzzles. `loadPuzzleContent(unknown)` validates another bundle and rejects duplicate level IDs, invalid stroke references, ambiguous answers, or missing full-source answers. Regenerate the bundled JSON with `pnpm generate:puzzles`; edit the reviewed source maps instead of the output.

## Dependencies

- `zod`
