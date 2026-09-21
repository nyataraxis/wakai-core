import { createPuzzleState, type PuzzleLevel, type PuzzleState } from '@wakai-core/core';

const progressKey = (version: string, level: PuzzleLevel) => `wakai:puzzle:${version}:${level.id}`;
const campaignKey = (version: string) => `wakai:puzzle:${version}:completed`;
const settingsKey = 'wakai:puzzle:settings';

export interface PuzzleSettings {
  unlockAllLevels: boolean;
}

export const restoreSettings = (): PuzzleSettings => {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(settingsKey) ?? 'null');
    return {
      unlockAllLevels:
        typeof stored === 'object' &&
        stored !== null &&
        'unlockAllLevels' in stored &&
        stored.unlockAllLevels === true
    };
  } catch {
    return { unlockAllLevels: false };
  }
};

export const saveSettings = (settings: PuzzleSettings): boolean => {
  try {
    localStorage.setItem(settingsKey, JSON.stringify(settings));
    return true;
  } catch {
    return false;
  }
};

export const restoreCompletedLevels = (
  version: string,
  levels: readonly PuzzleLevel[]
): string[] => {
  let stored: unknown = null;
  try {
    stored = JSON.parse(localStorage.getItem(campaignKey(version)) ?? 'null');
  } catch {
    // Individual level saves can still recover campaign completion.
  }
  const completed = Array.isArray(stored) ? stored : [];
  return levels
    .filter(
      (level) =>
        completed.includes(level.id) || restoreProgress(version, level).status === 'COMPLETED'
    )
    .map((level) => level.id);
};

export const saveCompletedLevels = (version: string, completed: readonly string[]): boolean => {
  try {
    localStorage.setItem(campaignKey(version), JSON.stringify(completed));
    return true;
  } catch {
    return false;
  }
};

export const lastUnlockedLevel = (
  levels: readonly PuzzleLevel[],
  completed: readonly string[]
): number => {
  const firstIncomplete = levels.findIndex((level) => !completed.includes(level.id));
  return firstIncomplete === -1 ? Math.max(0, levels.length - 1) : firstIncomplete;
};

export const restoreProgress = (version: string, level: PuzzleLevel): PuzzleState => {
  const initial = createPuzzleState();
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(progressKey(version, level)) ?? 'null');
    if (typeof stored !== 'object' || stored === null) return initial;
    const record = stored as Record<string, unknown>;
    const knownAnswers = (value: unknown, answers: PuzzleLevel['requiredAnswers']): string[] =>
      Array.isArray(value)
        ? answers
            .filter((answer) => value.includes(answer.character))
            .map((answer) => answer.character)
        : [];
    const foundRequired = knownAnswers(record.foundRequired, level.requiredAnswers);
    const foundBonus = knownAnswers(record.foundBonus, level.bonusAnswers);
    return {
      ...initial,
      foundRequired,
      foundBonus,
      status:
        foundRequired.length === level.requiredAnswers.length
          ? 'COMPLETED'
          : foundRequired.length + foundBonus.length > 0
            ? 'IN_PROGRESS'
            : 'UNSTARTED'
    };
  } catch {
    return initial;
  }
};

export const saveProgress = (version: string, level: PuzzleLevel, state: PuzzleState): boolean => {
  try {
    localStorage.setItem(
      progressKey(version, level),
      JSON.stringify({
        foundRequired: state.foundRequired,
        foundBonus: state.foundBonus
      })
    );
    return true;
  } catch {
    return false;
  }
};
