import { reachableElements, type AlchemyBundle } from './alchemy.js';

export interface AlchemyLevel {
  index: number;
  newSeeds: string[];
  seeds: string[];
  reachable: string[];
  discoveryTarget: number;
}

export interface AlchemyProgression {
  levels: AlchemyLevel[];
  elementLevels: Record<string, number>;
}

export interface AlchemyJourney {
  level: number;
  unlocked: string[];
}

export interface AlchemyProgressionOptions {
  initialSize?: number;
  batchSize?: number;
}

function positiveSize(value: number | undefined, fallback: number): number {
  return value !== undefined && Number.isInteger(value) && value > 0 ? value : fallback;
}

export function createAlchemyProgression(
  content: AlchemyBundle,
  options: AlchemyProgressionOptions = {}
): AlchemyProgression {
  const initialSize = positiveSize(options.initialSize, 48);
  const batchSize = positiveSize(options.batchSize, 20);
  const usage = new Map<string, number>();
  for (const recipe of content.recipes) {
    for (const id of new Set(recipe.components)) usage.set(id, (usage.get(id) ?? 0) + 1);
  }
  const orderedSeeds = [...new Set(content.seeds)].sort(
    (a, b) => (usage.get(b) ?? 0) - (usage.get(a) ?? 0) || (a < b ? -1 : a > b ? 1 : 0)
  );
  const allSeeds = new Set(orderedSeeds);
  const levels: AlchemyLevel[] = [];
  const elementLevels: Record<string, number> = {};
  let seeds: string[] = [];
  let offset = 0;
  do {
    const index = levels.length;
    const newSeeds = orderedSeeds.slice(offset, offset + (index === 0 ? initialSize : batchSize));
    seeds = [...seeds, ...newSeeds];
    offset += newSeeds.length;
    const reachable = [...reachableElements(seeds, content.recipes)];
    const discoveries = reachable.filter((id) => !allSeeds.has(id)).length;
    const previousTarget = levels.at(-1)?.discoveryTarget ?? 0;
    levels.push({
      index,
      newSeeds,
      seeds,
      reachable,
      discoveryTarget:
        offset === orderedSeeds.length ? discoveries : Math.min(previousTarget + 20, discoveries)
    });
    for (const id of reachable) {
      if (!Object.hasOwn(elementLevels, id)) elementLevels[id] = index;
    }
  } while (offset < orderedSeeds.length);
  return { levels, elementLevels };
}

export function createAlchemyJourney(
  content: AlchemyBundle,
  progression: AlchemyProgression
): AlchemyJourney {
  return { level: 0, unlocked: [...(progression.levels[0]?.seeds ?? content.seeds)] };
}

function normalizeJourney(
  journey: AlchemyJourney,
  content: AlchemyBundle,
  progression: AlchemyProgression
): AlchemyJourney {
  if (!Number.isInteger(journey.level)) return createAlchemyJourney(content, progression);
  const level = Math.max(0, Math.min(journey.level, progression.levels.length - 1));
  const current = progression.levels[level];
  if (!current) return createAlchemyJourney(content, progression);
  const reachable = new Set(current.reachable);
  return {
    level,
    unlocked: [
      ...new Set([...current.seeds, ...journey.unlocked.filter((id) => reachable.has(id))])
    ]
  };
}

export function readAlchemyJourney(
  value: string | null,
  content: AlchemyBundle,
  progression: AlchemyProgression
): AlchemyJourney {
  const fresh = () => createAlchemyJourney(content, progression);
  if (!value) return fresh();
  try {
    const parsed: unknown = JSON.parse(value);
    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      !('contentVersion' in parsed) ||
      parsed.contentVersion !== `${content.contentVersion}:levels-1` ||
      !('level' in parsed) ||
      typeof parsed.level !== 'number' ||
      !Number.isInteger(parsed.level) ||
      !('unlocked' in parsed) ||
      !Array.isArray(parsed.unlocked)
    )
      return fresh();
    return normalizeJourney(
      {
        level: parsed.level,
        unlocked: parsed.unlocked.filter((id): id is string => typeof id === 'string')
      },
      content,
      progression
    );
  } catch {
    return fresh();
  }
}

export function serializeAlchemyJourney(
  journey: AlchemyJourney,
  content: AlchemyBundle,
  progression: AlchemyProgression
): string {
  return JSON.stringify({
    contentVersion: `${content.contentVersion}:levels-1`,
    ...normalizeJourney(journey, content, progression)
  });
}

export function advanceAlchemyJourney(
  journey: AlchemyJourney,
  content: AlchemyBundle,
  progression: AlchemyProgression
): AlchemyJourney {
  const current = normalizeJourney(journey, content, progression);
  const level = progression.levels[current.level];
  const next = progression.levels[current.level + 1];
  const allSeeds = new Set(content.seeds);
  const discoveries = current.unlocked.filter((id) => !allSeeds.has(id)).length;
  if (!level || !next || discoveries < level.discoveryTarget) return current;
  return normalizeJourney({ level: next.index, unlocked: current.unlocked }, content, progression);
}
