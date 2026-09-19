import { createPuzzleState, type PuzzleLevel, type PuzzleState } from '@wakai-core/core';

const progressKey = (version: string, level: PuzzleLevel) => `wakai:puzzle:${version}:${level.id}`;

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
