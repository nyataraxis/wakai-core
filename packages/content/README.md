# Content Package

Content schema, loaders, and versioning for Wakai Core.

`loadAlchemyContent` in `src/alchemy.ts` is the web application's data boundary.
It validates the generated schema, unique IDs, references, normalized signatures,
all collision outputs, reachability witnesses, complete closure, and statistics.
The default ten-kanji demo and older loaders are retained for compatibility and
are not the audited content source.

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
