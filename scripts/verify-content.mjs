import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { loadAlchemyContent } from '../packages/content/dist/index.js';
import { mergeAlchemy } from '../packages/core/dist/index.js';

const content = loadAlchemyContent(
  await readFile(new URL('../data/generated/alchemy.json', import.meta.url), 'utf8')
);
const inventory = new Set(content.seeds);
const witnesses = Object.entries(content.witnesses).sort(([, a], [, b]) => a.depth - b.depth);
const recipes = new Map(content.recipes.map((recipe) => [recipe.id, recipe]));
for (const [output, witness] of witnesses) {
  if (inventory.has(output)) continue;
  const recipe = recipes.get(witness.recipeId);
  assert.ok(recipe, `Missing recipe witness for ${output}`);
  const result = mergeAlchemy({ components: recipe.components, inventory, content });
  assert.ok(result.success && result.outputs.includes(output), `Gameplay cannot reach ${output}`);
  for (const id of result.outputs) inventory.add(id);
}
assert.equal(inventory.size, content.elements.length);
if (content.stats.seedMinimality === 'minimum-for-acyclic-graph') {
  const outputs = new Set(content.recipes.map((recipe) => recipe.output));
  assert.ok(
    content.seeds.every((seed) => !outputs.has(seed)),
    'Minimum certificate contains a seed with a producer'
  );
}
for (const recipe of content.recipes) {
  const result = mergeAlchemy({ components: recipe.components, inventory, content });
  assert.ok(
    result.success && result.outputs.includes(recipe.output),
    `Unplayable recipe ${recipe.id}`
  );
  assert.equal(result.newDiscoveries.length, 0);
}
console.log(
  `Validated schema, graph witnesses, all ${content.recipes.length} recipes, and gameplay reachability of ${inventory.size} elements (${content.stats.kanji} kanji).`
);
