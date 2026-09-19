import type { AlchemyBundle, AlchemyRecipe } from './alchemy.js';

export type MergeArity = 2 | 3 | 4;

function buildWitnesses(seeds: Iterable<string>, recipes: readonly AlchemyRecipe[]) {
  const witnesses: AlchemyBundle['witnesses'] = Object.fromEntries(
    [...seeds].map((id) => [id, { depth: 0 }])
  );
  let changed = true;
  while (changed) {
    changed = false;
    for (const recipe of recipes) {
      if (witnesses[recipe.output] || recipe.components.some((id) => !witnesses[id])) continue;
      witnesses[recipe.output] = {
        depth: 1 + Math.max(...recipe.components.map((id) => witnesses[id].depth)),
        recipeId: recipe.id
      };
      changed = true;
    }
  }
  return witnesses;
}

export function createAlchemyMode(content: AlchemyBundle, arity: MergeArity): AlchemyBundle {
  const recipes = content.recipes.filter((recipe) => recipe.components.length === arity);
  const participants = new Set(recipes.flatMap((recipe) => [recipe.output, ...recipe.components]));
  const elements = content.elements.filter((element) => participants.has(element.id));
  const producers = new Set(recipes.map((recipe) => recipe.output));
  const seeds = new Set(
    elements.filter((element) => !producers.has(element.id)).map(({ id }) => id)
  );
  let witnesses = buildWitnesses(seeds, recipes);
  for (const { id } of elements) {
    if (witnesses[id]) continue;
    seeds.add(id);
    witnesses = buildWitnesses(seeds, recipes);
  }
  for (const id of [...seeds].reverse()) {
    if (!producers.has(id)) continue;
    const candidate = new Set(seeds);
    candidate.delete(id);
    if (Object.keys(buildWitnesses(candidate, recipes)).length === elements.length)
      seeds.delete(id);
  }
  witnesses = buildWitnesses(seeds, recipes);
  const outputs = new Map<string, Set<string>>();
  for (const recipe of recipes) {
    const matches = outputs.get(recipe.signature) ?? new Set<string>();
    matches.add(recipe.output);
    outputs.set(recipe.signature, matches);
  }
  return {
    ...content,
    contentVersion: `${content.contentVersion}:merge-${arity}`,
    elements,
    recipes,
    seeds: [...seeds],
    fusionIndex: Object.fromEntries([...outputs].map(([signature, ids]) => [signature, [...ids]])),
    witnesses,
    stats: {
      kanji: elements.filter((element) => element.kind === 'kanji').length,
      elements: elements.length,
      recipes: recipes.length,
      seeds: seeds.size,
      reachable: Object.keys(witnesses).length,
      arities: recipes.length ? { [arity]: recipes.length } : {},
      seedMinimality: 'inclusion-minimal'
    }
  };
}
