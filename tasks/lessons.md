# Lessons Learned

## KanjiVG SVG Parsing

- KanjiVG SVGs use intermediate `<g>` elements without `kvg:element` as structural groupings (for layout/position). These must be "promoted through" when extracting component trees -- their children with `kvg:element` should be collected as if they were direct children of the parent.
- Variant SVGs (filenames with dashes like `04e14-Kaisho.svg`) are alternate renderings of the same character and should be skipped during decomposition. Only canonical files (no dash in filename) should be parsed.
- The `kvg:variant="true" kvg:original="X"` attributes indicate a component is a visual variant of X. These auto-detected mappings need filtering before adding to the normalization map -- some are circular or semantically incorrect (e.g., 人→入).

## Component Decomposition Strategy

- Use **direct first-level children** (not recursive leaf decomposition) for merge components. A kanji's merge recipe should list the visible sub-parts the learner can recognize, not their deepest atomic strokes.
- Example: 寝's direct components are [宀, ⺦, ⺕, 冖, 又], not [冖] (which is what you'd get by recursively decomposing 宀 down to its leaf).

## Normalization Map

- Block known-problematic characters from auto-detection (人, 月, 東, etc. where KanjiVG variant data creates misleading mappings).
- Always check for circular references before adding auto-detected variant mappings.
- Kana→component mappings are separate from radical variant mappings and should always take priority.

## PowerShell Gotcha

- PowerShell doesn't support `&&` for command chaining. Use `;` or run commands separately.
