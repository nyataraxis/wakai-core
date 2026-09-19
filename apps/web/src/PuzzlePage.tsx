import { useEffect, useState } from 'react';
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
import { restoreProgress, saveProgress } from './puzzleProgress';
import styles from './PuzzlePage.module.css';

const content = getPuzzleContent();
const strokeCount = (answer: PuzzleAnswer) =>
  Math.min(...answer.variants.map((variant) => variant.strokeIds.length));

export const PuzzlePage = () => {
  const [levelIndex, setLevelIndex] = useState(0);
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <a href="#/puzzle" className={styles.brand} aria-label="Wakai hidden kanji home">
          <span className={styles.brandMark} lang="ja">
            和
          </span>
          wakai<span className={styles.brandDot}>.</span>
        </a>
        <nav aria-label="Game modes" className={styles.nav}>
          <a href="#/puzzle" aria-current="page">
            Hidden kanji
          </a>
          <a href="#/fusion">
            Fusion lab <span aria-hidden="true">↗</span>
          </a>
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
            <p className={styles.description}>A whole world of kanji, hidden in plain sight.</p>
          </div>
          <label className={styles.levelPicker}>
            YOUR EXPLORATION
            <select
              value={levelIndex}
              onChange={(event) => setLevelIndex(Number(event.target.value))}
            >
              {content.levels.map((level, index) => (
                <option key={level.id} value={index}>
                  {String(index + 1).padStart(2, '0')} · {level.title}
                </option>
              ))}
            </select>
          </label>
        </div>
        <PuzzleGame
          key={content.levels[levelIndex].id}
          level={content.levels[levelIndex]}
          levelIndex={levelIndex}
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
}

const PuzzleGame = ({ level, levelIndex, onNext }: PuzzleGameProps) => {
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
          : `Meaning: ${answer.meaning ?? 'Keep looking for the highlighted shape.'}`
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
