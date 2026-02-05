# Content Generator Refactoring - Completed

## Summary
Refactored the content generation pipeline to:
1. Add unique IDs to all kanji entries (format: `k-{hex}` where hex is the Unicode code point)
2. Include KanjiVG SVG filenames in kanji entries
3. Split content into multiple files by component count
4. Create a utility for generating minimal initial sets

## Changes Made

### Schema Updates (`packages/content/src/schema.ts`)
- Added `SymbolId` type for unique identifiers
- Added `id` and `svgFile` fields to `KanjiEntrySchema`
- Created new schemas for split files:
  - `KanjiLevelFileSchema`
  - `FusionIndexLevelFileSchema`
  - `NormalizeMapFileSchema`
  - `StartSetFileSchema`
  - `DebugFileSchema`
  - `MinimalSetFileSchema`

### Parser Updates (`packages/content/scripts/parse-kanjivg.ts`)
- Added `KanjivgEntry` interface with `components` and `svgFile` fields
- Modified `parseKanjivgDir` to return SVG filenames

### Build Components (`packages/content/scripts/build-components.ts`)
- Updated to handle new `KanjivgEntry` format
- Added `svgFileByKanji` to output

### Build Content (`packages/content/scripts/build-content.ts`)
- Added `generateId()` function for creating unique IDs
- Added functions to split kanji and fusion index by component level
- Added file writers for each split file type
- Now generates 14 split files plus `content.full.json`

### New Utility (`packages/content/scripts/generate-minimal-set.ts`)
- New script to generate minimal initial sets
- Usage: `npm run build:minimal-set -- --fusions=N`
- Finds all primitives needed for kanji up to level N

### Tests (`packages/content/tests/content.test.ts`)
- Updated to validate all split file schemas
- Simplified accessibility test to verify level 1-2 data availability

### Package Scripts (`packages/content/package.json`)
- Added `build:content` script
- Added `build:minimal-set` script

## Generated Files

```
data/generated/
├── kanji.level1.json        # 1617 kanji (0-1 components)
├── kanji.level2.json        # 5347 kanji (2 components)
├── kanji.level3.json        # 3 component kanji
├── kanji.level4.json        # 4 component kanji
├── kanji.level5plus.json    # 5+ component kanji
├── fusionIndex.level1.json
├── fusionIndex.level2.json
├── fusionIndex.level3.json
├── fusionIndex.level4.json
├── fusionIndex.level5plus.json
├── normalizeMap.json
├── startSet.json
├── debug.json
├── minimalSet.level1.json   # 1617 entries
├── minimalSet.level2.json   # 1897 entries
├── minimalSet.level3.json   # 1827 entries
└── content.full.json        # Combined file (backward compatible)
```

## Verification
- All tests pass (7/7)
- No linter errors
- Content regenerated successfully
