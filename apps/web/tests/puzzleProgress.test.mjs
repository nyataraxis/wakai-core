import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { after, beforeEach, test } from 'node:test';
import {
  lastUnlockedLevel,
  restoreCompletedLevels,
  restoreProgress,
  restoreSettings,
  saveCompletedLevels,
  saveProgress,
  saveSettings
} from '../src/puzzleProgress.ts';

const { levels } = JSON.parse(
  readFileSync(new URL('../../../packages/content/src/puzzleLevels.json', import.meta.url), 'utf8')
);
const originalStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
let storage;

beforeEach(() => {
  storage = new Map();
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key) => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, value)
    }
  });
});

after(() => {
  if (originalStorage) Object.defineProperty(globalThis, 'localStorage', originalStorage);
  else delete globalThis.localStorage;
});

test('dev mode persists independently of discoveries and content versions', () => {
  const state = { foundRequired: [levels[0].requiredAnswers[0].character], foundBonus: [] };
  saveProgress('v1', levels[0], state);
  assert.deepEqual(restoreSettings(), { unlockAllLevels: false });
  assert.equal(saveSettings({ unlockAllLevels: true }), true);
  assert.deepEqual(restoreSettings(), { unlockAllLevels: true });
  saveSettings({ unlockAllLevels: false });
  assert.deepEqual(restoreProgress('v1', levels[0]).foundRequired, state.foundRequired);
  assert.deepEqual(restoreCompletedLevels('v2', levels), []);
});

test('untrusted settings require an explicit boolean true', () => {
  for (const value of [
    '{',
    'null',
    'true',
    '{"unlockAllLevels":"true"}',
    '{"unlockAllLevels":1}'
  ]) {
    storage.set('wakai:puzzle:settings', value);
    assert.deepEqual(restoreSettings(), { unlockAllLevels: false });
  }
});

test('normal progression requires contiguous completion, including after dev mode', () => {
  assert.equal(lastUnlockedLevel(levels, []), 0);
  assert.equal(lastUnlockedLevel(levels, [levels[2].id]), 0);
  assert.equal(lastUnlockedLevel(levels, [levels[0].id, levels[2].id]), 1);
  assert.equal(
    lastUnlockedLevel(
      levels,
      levels.map((level) => level.id)
    ),
    levels.length - 1
  );
});

test('completed level saves recover campaign progress and ignore unknown level IDs', () => {
  saveProgress('v1', levels[0], {
    foundRequired: levels[0].requiredAnswers.map((answer) => answer.character),
    foundBonus: []
  });
  storage.set('wakai:puzzle:v1:completed', '["unknown-level"]');
  assert.deepEqual(restoreCompletedLevels('v1', levels), [levels[0].id]);
  storage.set('wakai:puzzle:v1:completed', '{');
  assert.deepEqual(restoreCompletedLevels('v1', levels), [levels[0].id]);
});

test('restarting a completed puzzle preserves its earned campaign unlock', () => {
  saveCompletedLevels('v1', [levels[0].id]);
  saveProgress('v1', levels[0], { foundRequired: [], foundBonus: [] });
  assert.equal(restoreProgress('v1', levels[0]).status, 'UNSTARTED');
  assert.deepEqual(restoreCompletedLevels('v1', levels), [levels[0].id]);
  assert.equal(lastUnlockedLevel(levels, restoreCompletedLevels('v1', levels)), 1);
});

test('blocked device storage falls back without crashing', () => {
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    get() {
      throw new Error('Storage blocked');
    }
  });
  assert.deepEqual(restoreSettings(), { unlockAllLevels: false });
  assert.equal(saveSettings({ unlockAllLevels: true }), false);
  assert.deepEqual(restoreCompletedLevels('v1', levels), []);
  assert.equal(saveCompletedLevels('v1', [levels[0].id]), false);
  assert.equal(saveProgress('v1', levels[0], { foundRequired: [], foundBonus: [] }), false);
});
