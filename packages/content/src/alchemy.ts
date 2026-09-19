import { z } from 'zod';
import { createSignature, reachableElements, type AlchemyBundle } from '@wakai-core/core';

const identifier = z
  .string()
  .min(1)
  .refine((value) => !value.includes('|'), 'Invalid element identifier');
export const AlchemySchema: z.ZodType<AlchemyBundle> = z.object({
  contentVersion: z.string().min(1),
  source: z.object({
    name: z.string(),
    url: z.string().url(),
    revision: z.string().min(1),
    license: z.string(),
    sha256: z.string().regex(/^[a-f0-9]{64}$/)
  }),
  normalizationMap: z.record(identifier, identifier),
  elements: z
    .array(
      z.object({
        id: identifier,
        glyph: z.string().min(1),
        kind: z.enum(['kanji', 'component']),
        atomicReason: z.string().optional()
      })
    )
    .min(1),
  recipes: z.array(
    z.object({
      id: z.string().min(1),
      output: identifier,
      components: z.array(identifier).min(2).max(4),
      originalComponents: z.array(identifier).min(2).max(4),
      signature: z.string().min(1),
      source: z.object({ file: z.string().regex(/^[a-f0-9]+\.svg$/), nodeId: z.string().min(1) })
    })
  ),
  fusionIndex: z.record(z.string(), z.array(identifier).min(1)),
  seeds: z.array(identifier).min(1),
  witnesses: z.record(
    identifier,
    z.object({ depth: z.number().int().nonnegative(), recipeId: z.string().optional() })
  ),
  stats: z.object({
    kanji: z.number().int().nonnegative(),
    elements: z.number().int().nonnegative(),
    recipes: z.number().int().nonnegative(),
    seeds: z.number().int().nonnegative(),
    reachable: z.number().int().nonnegative(),
    arities: z.record(z.string(), z.number().int().nonnegative()),
    seedMinimality: z.enum(['minimum-for-acyclic-graph', 'inclusion-minimal'])
  })
});

export function loadAlchemyContent(value: unknown): AlchemyBundle {
  const content = AlchemySchema.parse(typeof value === 'string' ? JSON.parse(value) : value);
  const ids = new Set(content.elements.map((element) => element.id));
  const assert = (valid: boolean, message: string) => {
    if (!valid) throw new Error(`Invalid alchemy content: ${message}`);
  };
  assert(ids.size === content.elements.length, 'duplicate elements');
  const seeds = new Set(content.seeds);
  assert(
    seeds.size === content.seeds.length && content.seeds.every((id) => ids.has(id)),
    'invalid seeds'
  );
  for (const alias of Object.keys(content.normalizationMap)) {
    createSignature([alias], content.normalizationMap);
  }
  const recipes = new Map(content.recipes.map((recipe) => [recipe.id, recipe]));
  assert(recipes.size === content.recipes.length, 'duplicate recipe IDs');
  const expectedIndex = new Map<string, Set<string>>();
  const arities: Record<string, number> = {};
  for (const recipe of content.recipes) {
    assert(
      ids.has(recipe.output) && recipe.components.every((id) => ids.has(id)),
      'dangling recipe element'
    );
    assert(
      recipe.components.length === recipe.originalComponents.length,
      'ingredient count mismatch'
    );
    assert(
      recipe.signature === createSignature(recipe.components, content.normalizationMap),
      'signature mismatch'
    );
    assert(
      recipe.signature === createSignature(recipe.originalComponents, content.normalizationMap),
      'normalization mismatch'
    );
    const outputs = expectedIndex.get(recipe.signature) ?? new Set<string>();
    outputs.add(recipe.output);
    expectedIndex.set(recipe.signature, outputs);
    arities[recipe.components.length] = (arities[recipe.components.length] ?? 0) + 1;
  }
  assert(expectedIndex.size === Object.keys(content.fusionIndex).length, 'index size mismatch');
  for (const [signature, outputs] of expectedIndex) {
    const indexed = content.fusionIndex[signature] ?? [];
    assert(
      indexed.length === outputs.size &&
        new Set(indexed).size === outputs.size &&
        indexed.every((id) => outputs.has(id)),
      'index drops or invents results'
    );
  }
  assert(Object.keys(content.witnesses).length === ids.size, 'witness count mismatch');
  for (const id of ids) {
    const witness = content.witnesses[id];
    assert(Boolean(witness), `missing witness for ${id}`);
    if (seeds.has(id)) {
      assert(witness.depth === 0 && !witness.recipeId, 'invalid seed witness');
    } else {
      const recipe = recipes.get(witness.recipeId ?? '');
      assert(
        Boolean(recipe) && recipe?.output === id && witness.depth > 0,
        'invalid recipe witness'
      );
      assert(
        Boolean(
          recipe?.components.every(
            (component) => content.witnesses[component]?.depth < witness.depth
          )
        ),
        'cyclic witness'
      );
    }
  }
  assert(
    reachableElements(content.seeds, content.recipes).size === ids.size,
    'unreachable elements'
  );
  assert(
    content.stats.elements === ids.size &&
      content.stats.seeds === seeds.size &&
      content.stats.recipes === recipes.size &&
      content.stats.reachable === ids.size &&
      content.stats.kanji === content.elements.filter((element) => element.kind === 'kanji').length,
    'statistics mismatch'
  );
  assert(
    Object.keys(arities).length === Object.keys(content.stats.arities).length &&
      Object.entries(arities).every(([arity, count]) => content.stats.arities[arity] === count),
    'arity statistics mismatch'
  );
  return content;
}
