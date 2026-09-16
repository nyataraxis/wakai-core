import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { loadAlchemyContent } from '../packages/content/dist/index.js';
import {
  advanceAlchemyJourney,
  createAlchemyJourney,
  createAlchemyMode,
  createAlchemyProgression,
  mergeAlchemy,
  reachableElements
} from '../packages/core/dist/index.js';

const content = loadAlchemyContent(
  await readFile(new URL('../data/generated/alchemy.json', import.meta.url), 'utf8')
);
function verifyGameplay(content, label) {
  const inventory = new Set(content.seeds);
  const witnesses = Object.entries(content.witnesses).sort(([, a], [, b]) => a.depth - b.depth);
  const recipes = new Map(content.recipes.map((recipe) => [recipe.id, recipe]));
  for (const [output, witness] of witnesses) {
    if (inventory.has(output)) continue;
    const recipe = recipes.get(witness.recipeId);
    assert.ok(recipe, `${label}: Missing recipe witness for ${output}`);
    const result = mergeAlchemy({ components: recipe.components, inventory, content });
    assert.ok(
      result.success && result.outputs.includes(output),
      `${label}: Gameplay cannot reach ${output}`
    );
    for (const id of result.outputs) inventory.add(id);
  }
  assert.equal(inventory.size, content.elements.length);
  if (content.stats.seedMinimality === 'minimum-for-acyclic-graph') {
    const outputs = new Set(content.recipes.map((recipe) => recipe.output));
    assert.ok(
      content.seeds.every((seed) => !outputs.has(seed)),
      `${label}: Minimum certificate contains a seed with a producer`
    );
  }
  for (const recipe of content.recipes) {
    const result = mergeAlchemy({ components: recipe.components, inventory, content });
    assert.ok(
      result.success && result.outputs.includes(recipe.output),
      `${label}: Unplayable recipe ${recipe.id}`
    );
    assert.equal(result.newDiscoveries.length, 0);
  }
  console.log(
    `${label}: Validated schema, graph witnesses, all ${content.recipes.length} recipes, and gameplay reachability of ${inventory.size} elements (${content.stats.kanji} kanji) from ${content.seeds.length} starters.`
  );
}

function verifyProgression(content, label) {
  const progression = createAlchemyProgression(content);
  const allSeeds = new Set(content.seeds);
  const first = progression.levels[0];
  const fresh = createAlchemyJourney(content, progression);
  assert.equal(first.newSeeds.length, 48, `${label}: Incorrect initial starter count`);
  assert.deepEqual(fresh, { level: 0, unlocked: first.seeds });
  assert.ok(fresh.unlocked.every((id) => allSeeds.has(id)));
  assert.ok(
    content.seeds
      .filter((id) => !first.seeds.includes(id))
      .every((id) => !fresh.unlocked.includes(id))
  );
  assert.equal(advanceAlchemyJourney(fresh, content, progression).level, 0);

  let previousSeeds = [];
  for (const level of progression.levels) {
    if (level.index > 0) assert.ok(level.newSeeds.length > 0 && level.newSeeds.length <= 20);
    assert.deepEqual(level.seeds, [...previousSeeds, ...level.newSeeds]);
    assert.deepEqual(new Set(level.reachable), reachableElements(level.seeds, content.recipes));
    const discoveries = level.reachable.filter((id) => !allSeeds.has(id));
    assert.ok(level.discoveryTarget <= discoveries.length, `${label}: Unreachable level target`);
    const completed = { level: level.index, unlocked: level.reachable };
    const advanced = advanceAlchemyJourney(completed, content, progression);
    const next = progression.levels[level.index + 1];
    assert.equal(advanced.level, next?.index ?? level.index, `${label}: Progression softlock`);
    assert.deepEqual(
      new Set(advanced.unlocked),
      new Set([...level.reachable, ...(next?.newSeeds ?? [])]),
      `${label}: Advancing must preserve discoveries and grant only new starters`
    );
    previousSeeds = level.seeds;
  }
  assert.deepEqual(new Set(previousSeeds), allSeeds);
  assert.deepEqual(
    new Set(progression.levels.at(-1).reachable),
    new Set(content.elements.map(({ id }) => id))
  );
  console.log(
    `${label}: Validated ${progression.levels.length} progressive levels, ${first.reachable.length - first.seeds.length} initial discoveries, starter-only grants, achievable milestones, and complete final reachability.`
  );
}

verifyGameplay(content, 'Mixed corpus');
for (const arity of [2, 3, 4]) {
  const mode = loadAlchemyContent(createAlchemyMode(content, arity));
  verifyGameplay(mode, `${arity}-piece mode`);
  verifyProgression(mode, `${arity}-piece mode`);
}
