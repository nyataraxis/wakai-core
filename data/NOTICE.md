# Kanji Alchemy data attribution

The generated alchemy and audit datasets are adaptations of **KanjiVG**, copyright
Ulrich Apel and contributors, licensed under **Creative Commons Attribution-Share
Alike 3.0**. The adapted datasets are distributed under the same license.

- Source: https://github.com/KanjiVG/kanjivg
- Documentation: https://kanjivg.tagaini.net/svg-format.html
- License: https://creativecommons.org/licenses/by-sa/3.0/
- Full license text: [KANJIVG-LICENSE.txt](KANJIVG-LICENSE.txt)

The exact source revision and SHA-256 digest are embedded in `alchemy.json`.
Changes: select canonical ideograph SVGs, parse complete component boundaries,
apply an explicit shape-alias table, derive bounded 2–4 component recipes,
retain ambiguous outputs, and compute seeds and reachability witnesses.
These recipes describe written forms; they are not claims about etymology.

The older `content.full.json`, `mergeMap.*.json`, `normalizeMap.json`,
`primitives.json`, and `debug.json` are unverified legacy KanjiVG adaptations.
They are retained for comparison and are not used by the application.
Their original upstream revision was not recorded.

The application includes a small manually authored set of English display
glosses for orientation. It does not currently ship a readings or meanings
dictionary. Source-backed structural validation is not a linguistic expert review.
