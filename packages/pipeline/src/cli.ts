import * as path from 'node:path'
import { parseAllSvgs } from './svgParser.js'
import { collectVariantMappings, identifyPrimitives, populateLeafComponents } from './decomposition.js'
import { buildNormalizeMap } from './normalization.js'
import { buildMergeMaps } from './mergeMaps.js'
import { writeAllOutputs } from './outputWriter.js'

const ROOT_DIR = path.resolve(import.meta.dirname, '..', '..', '..')
const KANJIVG_DIR = path.join(ROOT_DIR, 'data', 'raw', 'kanjivg')
const OUTPUT_DIR = path.join(ROOT_DIR, 'data', 'generated')

function run(): void {
  console.log('=== Wakai Content Map Pipeline ===\n')
  console.log(`KanjiVG dir: ${KANJIVG_DIR}`)
  console.log(`Output dir:  ${OUTPUT_DIR}\n`)

  console.log('Step 1: Parsing KanjiVG SVGs...')
  const decompositions = parseAllSvgs(KANJIVG_DIR)

  console.log('\nStep 2: Collecting variant mappings...')
  const variantMappings = collectVariantMappings(decompositions)
  console.log(`Found ${variantMappings.size} variant mappings`)

  console.log('\nStep 3: Building normalization map...')
  const normalizeMap = buildNormalizeMap(variantMappings)
  console.log(`Normalization map has ${Object.keys(normalizeMap).length} entries`)

  console.log('\nStep 4: Populating leaf components...')
  populateLeafComponents(decompositions)

  console.log('\nStep 5: Identifying primitives...')
  const primitives = identifyPrimitives(decompositions)
  console.log(`Found ${primitives.size} primitive elements`)

  console.log('\nStep 6: Building merge maps...')
  const knownKanji = new Set(decompositions.keys())
  const mergeMaps = buildMergeMaps(decompositions, knownKanji)

  console.log('\nStep 7: Writing output files...')
  writeAllOutputs(OUTPUT_DIR, primitives, normalizeMap, mergeMaps, decompositions)

  console.log('\n=== Pipeline complete ===')
}

run()
