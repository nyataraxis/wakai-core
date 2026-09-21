import { useCallback, useEffect, useRef, useState } from 'react';
import { getPuzzleContent } from '@wakai-core/content';
import {
  clearSelection,
  createPuzzleState,
  submitSelection,
  toggleStroke,
  type PuzzleAnswer,
  type PuzzleLevel,
  type PuzzleState
} from '@wakai-core/core';
import {
  lastUnlockedLevel,
  restoreCompletedLevels,
  restoreProgress,
  restoreSettings,
  saveCompletedLevels,
  saveProgress,
  saveSettings
} from './puzzleProgress';
import styles from './PuzzlePage.module.css';

const content = getPuzzleContent();
const levelsPerPage = 24;
const strokeCount = (answer: PuzzleAnswer) =>
  Math.min(...answer.variants.map((variant) => variant.strokeIds.length));

export const PuzzlePage = () => {
  const [levelIndex, setLevelIndex] = useState(0);
  const [settings, setSettings] = useState(restoreSettings);
  const [settingsSaved, setSettingsSaved] = useState(true);
  const [completed, setCompleted] = useState(() =>
    restoreCompletedLevels(content.contentVersion, content.levels)
  );
  const [panel, setPanel] = useState<'levels' | 'settings' | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const browseButton = useRef<HTMLButtonElement>(null);
  const settingsButton = useRef<HTMLButtonElement>(null);
  const unlockedThrough = lastUnlockedLevel(content.levels, completed);
  const query = search.trim().toLocaleLowerCase();
  const matchingLevels = content.levels
    .map((level, index) => ({ level, index }))
    .filter(({ level, index }) =>
      `${index + 1} ${level.title} ${level.sourceGlyphs.map((glyph) => glyph.character).join('')}`
        .toLocaleLowerCase()
        .includes(query)
    );
  const pageCount = Math.max(1, Math.ceil(matchingLevels.length / levelsPerPage));
  const shownPage = Math.min(page, pageCount - 1);
  const visibleLevels = matchingLevels.slice(
    shownPage * levelsPerPage,
    (shownPage + 1) * levelsPerPage
  );
  const markComplete = useCallback((id: string) => {
    setCompleted((previous) => (previous.includes(id) ? previous : [...previous, id]));
  }, []);

  useEffect(() => {
    saveCompletedLevels(content.contentVersion, completed);
  }, [completed]);

  const openLevels = () => {
    setSearch('');
    setPage(Math.floor(levelIndex / levelsPerPage));
    setPanel(panel === 'levels' ? null : 'levels');
  };

  const closePanel = () => {
    setPanel(null);
    (panel === 'settings' ? settingsButton : browseButton).current?.focus();
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <a href="#/puzzle" className={styles.brand} aria-label="Wakai hidden kanji home">
          <span className={styles.brandMark} lang="ja">
            和
          </span>
          wakai<span className={styles.brandDot}>.</span>
        </a>
        <nav aria-label="Puzzle navigation" className={styles.nav}>
          <a href="#/puzzle" aria-current="page">
            Hidden kanji
          </a>
          <button
            ref={settingsButton}
            className={styles.textButton}
            aria-expanded={panel === 'settings'}
            aria-controls="puzzle-settings"
            onClick={() => setPanel(panel === 'settings' ? null : 'settings')}
          >
            Settings{settings.unlockAllLevels ? ' · Dev mode' : ''}
          </button>
        </nav>
      </header>
      <main className={styles.main}>
        <div className={styles.intro}>
          <div>
            <p className={styles.eyebrow}>
              <span /> A LITTLE MOMENT OF DISCOVERY
            </p>
            <h1>
              Less ink. <span>More to find.</span>
            </h1>
            <p className={styles.description}>
              {content.levels.length} intricate kanji. A world of shapes hidden inside each one.
            </p>
          </div>
          <div className={styles.levelPicker}>
            <span>
              {completed.length} / {content.levels.length} COMPLETE
            </span>
            <button
              ref={browseButton}
              className={styles.secondaryButton}
              aria-expanded={panel === 'levels'}
              aria-controls="puzzle-levels"
              onClick={openLevels}
            >
              Level {levelIndex + 1} of {content.levels.length} · Browse levels
            </button>
          </div>
        </div>
        {panel === 'settings' && (
          <section
            id="puzzle-settings"
            className={styles.campaignPanel}
            aria-labelledby="settings-title"
          >
            <div className={styles.panelHeader}>
              <h2 id="settings-title">Puzzle settings</h2>
              <button className={styles.textButton} onClick={closePanel}>
                Close settings
              </button>
            </div>
            <label className={styles.settingToggle}>
              <input
                type="checkbox"
                checked={settings.unlockAllLevels}
                onChange={(event) => {
                  const next = { unlockAllLevels: event.target.checked };
                  setSettings(next);
                  setSettingsSaved(saveSettings(next));
                  if (!next.unlockAllLevels && levelIndex > unlockedThrough)
                    setLevelIndex(unlockedThrough);
                }}
              />
              <span>
                <strong>Unlock all levels · Dev mode</strong>
                <span>
                  Explore any puzzle now. Discoveries still count; turning this off restores normal
                  level unlocking.
                </span>
              </span>
            </label>
            <p className={styles.panelNote}>
              {settingsSaved
                ? 'Settings are saved on this device.'
                : 'Settings are available for this visit only.'}
            </p>
          </section>
        )}
        {panel === 'levels' && (
          <section
            id="puzzle-levels"
            className={styles.campaignPanel}
            aria-labelledby="levels-title"
          >
            <div className={styles.panelHeader}>
              <div>
                <h2 id="levels-title">Explore the collection</h2>
                <p>
                  {settings.unlockAllLevels
                    ? 'Dev mode · All levels are available.'
                    : 'Complete each puzzle to unlock the next.'}
                </p>
              </div>
              <button className={styles.textButton} onClick={closePanel}>
                Close levels
              </button>
            </div>
            <label className={styles.levelSearch}>
              Find a level
              <input
                type="search"
                placeholder="Kanji, title, or level number"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(0);
                }}
              />
            </label>
            <div className={styles.levelGrid}>
              {visibleLevels.map(({ level, index }) => {
                const locked = !settings.unlockAllLevels && index > unlockedThrough;
                const done = completed.includes(level.id);
                const glyphs = level.sourceGlyphs.map((glyph) => glyph.character).join('');
                return (
                  <button
                    key={level.id}
                    className={styles.levelCard}
                    disabled={locked}
                    aria-current={levelIndex === index ? 'true' : undefined}
                    onClick={() => {
                      setLevelIndex(index);
                      closePanel();
                    }}
                  >
                    <span className={styles.levelCardNumber}>
                      {String(index + 1).padStart(3, '0')} ·{' '}
                      {locked ? 'Locked' : done ? 'Complete' : 'Explore'}
                    </span>
                    <span className={styles.levelCardGlyph} lang="ja">
                      {glyphs}
                    </span>
                    <span className={styles.levelCardTitle}>
                      {level.title === glyphs
                        ? `${level.sourceGlyphs.reduce((count, glyph) => count + glyph.strokes.length, 0)} strokes · ${level.requiredAnswers.length} discoveries`
                        : level.title}
                    </span>
                  </button>
                );
              })}
            </div>
            {matchingLevels.length === 0 && (
              <p className={styles.panelNote}>No matching levels. Try another kanji or number.</p>
            )}
            <div className={styles.pagination}>
              <button
                className={styles.secondaryButton}
                disabled={shownPage === 0}
                onClick={() => setPage(shownPage - 1)}
              >
                Previous
              </button>
              <span aria-live="polite">
                Page {shownPage + 1} of {pageCount} · {matchingLevels.length} levels
              </span>
              <button
                className={styles.secondaryButton}
                disabled={shownPage >= pageCount - 1}
                onClick={() => setPage(shownPage + 1)}
              >
                Next
              </button>
            </div>
          </section>
        )}
        <PuzzleGame
          key={content.levels[levelIndex].id}
          level={content.levels[levelIndex]}
          levelIndex={levelIndex}
          onComplete={markComplete}
          onNext={
            levelIndex < content.levels.length - 1 ? () => setLevelIndex(levelIndex + 1) : undefined
          }
        />
        <section className={styles.guide} aria-label="How to play">
          <div>
            <span>01</span>
            <p>
              <strong>Notice a shape</strong>Look for a kanji inside the original.
            </p>
          </div>
          <div>
            <span>02</span>
            <p>
              <strong>Keep its strokes</strong>Tap the strokes you want to use.
            </p>
          </div>
          <div>
            <span>03</span>
            <p>
              <strong>Make a discovery</strong>Check your selection. Try freely.
            </p>
          </div>
        </section>
      </main>
      <footer className={styles.footer}>
        <span>Take your time. There’s no wrong way to explore.</span>
        <span>
          Glyphs by{' '}
          <a href="https://kanjivg.tagaini.net/" target="_blank" rel="noreferrer">
            KanjiVG
          </a>{' '}
          ·{' '}
          <a
            href="https://creativecommons.org/licenses/by-sa/3.0/"
            target="_blank"
            rel="noreferrer"
          >
            CC BY-SA 3.0
          </a>
        </span>
      </footer>
    </div>
  );
};

interface PuzzleGameProps {
  level: PuzzleLevel;
  levelIndex: number;
  onNext?: () => void;
  onComplete: (id: string) => void;
}

const PuzzleGame = ({ level, levelIndex, onNext, onComplete }: PuzzleGameProps) => {
  const [state, setState] = useState(() => restoreProgress(content.contentVersion, level));
  const [feedback, setFeedback] = useState('Select the strokes of a kanji you can see.');
  const [hint, setHint] = useState<{ character: string; stage: number } | null>(null);
  const [details, setDetails] = useState<PuzzleAnswer | null>(null);
  const [preview, setPreview] = useState(false);
  const [saved, setSaved] = useState(true);
  const selected = state.selection;
  const complete = state.status === 'COMPLETED';
  const progress = state.foundRequired.length / level.requiredAnswers.length;
  const groups = [...new Set(level.requiredAnswers.map(strokeCount))].sort((a, b) => a - b);
  const hintedAnswer = level.requiredAnswers.find((answer) => answer.character === hint?.character);
  const hintedVariant = hintedAnswer?.variants[0];

  useEffect(() => {
    setSaved(saveProgress(content.contentVersion, level, state));
  }, [level, state]);

  useEffect(() => {
    if (complete) onComplete(level.id);
  }, [complete, level.id, onComplete]);

  const changeState = (next: PuzzleState) => {
    setState(next);
    setPreview(false);
  };

  const submit = () => {
    const result = submitSelection(level, state);
    changeState(result.state);
    if (result.outcome === 'EMPTY') setFeedback('Tap a stroke to begin your discovery.');
    if (result.outcome === 'WRONG')
      setFeedback('That combination isn’t in this puzzle. Try another shape.');
    if (result.outcome === 'ALREADY_FOUND')
      setFeedback(`You’ve already found ${result.answer?.character}. Try another shape.`);
    if (result.outcome === 'CORRECT' || result.outcome === 'BONUS') {
      const answer = result.answer;
      if (answer) {
        setDetails(answer);
        setFeedback(
          result.outcome === 'BONUS'
            ? `Bonus discovery! ${answer.character}`
            : `You found ${answer.character}${answer.meaning ? ` — ${answer.meaning}` : ''}.`
        );
        if (hint?.character === answer.character) setHint(null);
      }
    }
  };

  const useHint = () => {
    const answer =
      hintedAnswer ??
      level.requiredAnswers.find((entry) => !state.foundRequired.includes(entry.character));
    if (!answer) return;
    const stage = hint?.character === answer.character ? Math.min(4, hint.stage + 1) : 1;
    setHint({ character: answer.character, stage });
    if (stage === 1)
      setFeedback(`Look for a kanji with ${answer.variants[0].strokeIds.length} strokes.`);
    if (stage === 2)
      setFeedback(
        answer.readings?.length
          ? `Reading: ${answer.readings.join(' · ')}`
          : answer.meaning
            ? `Meaning: ${answer.meaning}`
            : 'No reading clue for this answer. The next hint highlights a stroke.'
      );
    if (stage === 3)
      setFeedback('The gold stroke is part of the answer. What else belongs with it?');
    if (stage === 4) {
      changeState({
        ...state,
        selection: { ...answer.variants[0], strokeIds: [...answer.variants[0].strokeIds] }
      });
      setFeedback(
        `It’s ${answer.character}. Its strokes are selected — check them to discover it.`
      );
    }
  };

  return (
    <div className={styles.gameLayout}>
      <section className={styles.board} aria-label={`${level.title} puzzle`}>
        <div className={styles.boardHeader}>
          <div>
            <span className={styles.levelTag}>LEVEL {String(levelIndex + 1).padStart(2, '0')}</span>
            <h2>{level.title}</h2>
          </div>
          <span className={styles.modeTag}>
            ✧ &nbsp; {level.sourceGlyphs.length > 1 ? 'Two glyphs' : 'One glyph'} · Kanji only
          </span>
        </div>
        <div className={styles.glyphArea}>
          {level.sourceGlyphs.map((glyph, glyphIndex) => (
            <div className={styles.glyphWrap} key={`${glyph.character}-${glyphIndex}`}>
              <svg
                className={styles.glyph}
                viewBox={glyph.viewBox}
                role="group"
                aria-label={`${glyph.character}: select individual strokes`}
              >
                <path className={styles.gridLines} d="M54.5 0V109M0 54.5H109" />
                {glyph.strokes.map((stroke, index) => {
                  const isSelected =
                    selected?.sourceGlyph === glyphIndex && selected.strokeIds.includes(stroke.id);
                  const isHinted =
                    (hint?.stage ?? 0) >= 3 &&
                    hintedVariant?.sourceGlyph === glyphIndex &&
                    hintedVariant.strokeIds[0] === stroke.id;
                  return (
                    <g
                      key={stroke.id}
                      role="button"
                      tabIndex={0}
                      aria-label={`${glyph.character}, stroke ${index + 1}`}
                      aria-pressed={Boolean(isSelected)}
                      className={`${styles.stroke} ${isSelected ? styles.selectedStroke : ''} ${isHinted ? styles.hintedStroke : ''} ${preview && !isSelected ? styles.hiddenStroke : ''}`}
                      onClick={() => changeState(toggleStroke(level, state, glyphIndex, stroke.id))}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          changeState(toggleStroke(level, state, glyphIndex, stroke.id));
                        }
                      }}
                    >
                      <path className={styles.strokeInk} d={stroke.path} />
                      <path className={styles.strokeHit} d={stroke.path} />
                    </g>
                  );
                })}
              </svg>
              {level.sourceGlyphs.length > 1 && (
                <span className={styles.glyphCaption}>GLYPH {glyphIndex + 1}</span>
              )}
            </div>
          ))}
        </div>
        <div className={styles.selectionBar}>
          <span>
            <span className={styles.selectionDot} />
            {selected?.strokeIds.length ?? 0} strokes selected
          </span>
          <button
            className={styles.textButton}
            disabled={!selected?.strokeIds.length}
            aria-pressed={preview}
            onClick={() => setPreview(!preview)}
          >
            {preview ? 'Show all strokes' : 'Isolate selection'}
          </button>
        </div>
        <div className={styles.actions}>
          <button
            className={styles.secondaryButton}
            disabled={!selected?.strokeIds.length}
            onClick={() => changeState(clearSelection(state))}
          >
            Clear
          </button>
          <button
            className={styles.primaryButton}
            disabled={!selected?.strokeIds.length}
            onClick={submit}
          >
            Check selection <span aria-hidden="true">↗</span>
          </button>
        </div>
        <p className={styles.feedback} role="status" aria-live="polite">
          {feedback}
        </p>
        <div className={styles.boardFooter}>
          <span>Keep strokes in place. Reuse them as often as you like.</span>
          <button className={styles.textButton} onClick={useHint} disabled={complete}>
            ✧ {hint ? `Hint ${Math.min(4, hint.stage + 1)} / 4` : 'A little hint'}
          </button>
        </div>
      </section>
      <aside className={styles.discoveries} aria-label="Your discoveries">
        <div className={styles.discoveryHeader}>
          <span className={styles.eyebrow}>YOUR DISCOVERIES</span>
          <span className={styles.smallFlower}>✳</span>
        </div>
        <div className={styles.progressTitle}>
          <h2>{complete ? 'Beautifully found.' : 'Find the hidden kanji'}</h2>
          <p>
            <strong>{state.foundRequired.length}</strong> / {level.requiredAnswers.length}
          </p>
        </div>
        <div
          className={styles.progressTrack}
          role="progressbar"
          aria-label="Required answers found"
          aria-valuenow={state.foundRequired.length}
          aria-valuemin={0}
          aria-valuemax={level.requiredAnswers.length}
        >
          <span style={{ width: `${progress * 100}%` }} />
        </div>
        <p className={styles.slotIntro}>A small clue: each group shares a stroke count.</p>
        <div className={styles.answerGroups}>
          {groups.map((count) => (
            <div className={styles.answerGroup} key={count}>
              <span>
                {count} {count === 1 ? 'stroke' : 'strokes'}
              </span>
              <div>
                {level.requiredAnswers
                  .filter((answer) => strokeCount(answer) === count)
                  .map((answer, index) => {
                    const found = state.foundRequired.includes(answer.character);
                    return found ? (
                      <button
                        className={styles.foundSlot}
                        key={answer.character}
                        lang="ja"
                        aria-label={`${answer.character}, ${answer.meaning ?? 'discovered kanji'}: show details`}
                        onClick={() => setDetails(answer)}
                      >
                        {answer.character}
                      </button>
                    ) : (
                      <span
                        key={answer.character}
                        className={styles.emptySlot}
                        aria-label={`Undiscovered ${count}-stroke answer ${index + 1}`}
                      >
                        ·
                      </span>
                    );
                  })}
              </div>
            </div>
          ))}
        </div>
        <div className={styles.bonusArea}>
          <div>
            <span>✧ Bonus discoveries</span>
            <span>{state.foundBonus.length}</span>
          </div>
          {state.foundBonus.length > 0 ? (
            <div className={styles.bonusSlots}>
              {level.bonusAnswers
                .filter((answer) => state.foundBonus.includes(answer.character))
                .map((answer) => (
                  <button
                    key={answer.character}
                    className={styles.foundSlot}
                    lang="ja"
                    onClick={() => setDetails(answer)}
                  >
                    {answer.character}
                  </button>
                ))}
            </div>
          ) : (
            <p>
              {level.bonusAnswers.length
                ? 'A few extra surprises. Never required.'
                : 'Every mapped answer here is a required discovery.'}
            </p>
          )}
        </div>
        {details && (
          <div className={styles.detailCard}>
            <span className={styles.detailCharacter} lang="ja">
              {details.character}
            </span>
            <div>
              <strong>{details.meaning ?? 'A new discovery'}</strong>
              <p lang="ja">{details.readings?.join(' · ')}</p>
            </div>
          </div>
        )}
        {complete && (
          <div className={styles.completion} role="status">
            <strong>Level complete ✦</strong>
            <p>
              {onNext
                ? 'Another little world is waiting.'
                : 'You’ve reached the end of this collection. Revisit any level to keep exploring.'}
            </p>
            {onNext && (
              <button className={styles.primaryButton} onClick={onNext}>
                Next puzzle <span aria-hidden="true">→</span>
              </button>
            )}
          </div>
        )}
        <div className={styles.rulesNote}>
          <span>THE SIMPLE RULE</span>
          <p>
            Keep only the strokes that form a kanji. The whole glyph counts, too.
            {level.sourceGlyphs.length > 1
              ? ' Each answer must come from one glyph; selecting another starts a fresh selection.'
              : ''}
          </p>
        </div>
        <div className={styles.saveNote}>
          <span>
            {saved
              ? '✓ Progress saved on this device'
              : 'Progress is available for this visit only'}
          </span>
          <button
            className={styles.textButton}
            onClick={() => {
              changeState(createPuzzleState());
              setHint(null);
              setDetails(null);
              setFeedback('A fresh page. See what you can find.');
            }}
          >
            Restart
          </button>
        </div>
      </aside>
    </div>
  );
};
