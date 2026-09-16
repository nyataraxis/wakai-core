import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { loadAlchemyContent } from '@wakai-core/content';
import {
  createAlchemyMode,
  createAlchemyProgression,
  createAlchemyJourney,
  readAlchemyJourney,
  serializeAlchemyJourney,
  advanceAlchemyJourney,
  mergeAlchemy,
  getCraftableRecipes,
  type AlchemyBundle,
  type AlchemyProgression,
  type AlchemyJourney,
  type MergeArity
} from '@wakai-core/core';
import styles from './App.module.css';

const STORAGE_KEY = 'wakai.kanji-alchemy.progress';
const MERGE_MODES = [2, 3, 4] as const;
const PAGE_SIZE = 80;
const labels: Record<string, string> = {
  一: 'one',
  二: 'two',
  三: 'three',
  四: 'four',
  五: 'five',
  六: 'six',
  七: 'seven',
  八: 'eight',
  九: 'nine',
  十: 'ten',
  人: 'person',
  大: 'big',
  小: 'small',
  木: 'tree',
  林: 'grove',
  森: 'forest',
  火: 'fire',
  炎: 'flame',
  水: 'water',
  日: 'sun',
  月: 'moon',
  明: 'bright',
  山: 'mountain',
  川: 'river',
  土: 'earth',
  田: 'field',
  石: 'stone',
  金: 'gold',
  雨: 'rain',
  空: 'sky',
  口: 'mouth',
  目: 'eye',
  耳: 'ear',
  手: 'hand',
  足: 'foot',
  心: 'heart',
  力: 'power',
  女: 'woman',
  子: 'child',
  好: 'like',
  男: 'man',
  休: 'rest',
  本: 'book',
  中: 'middle',
  上: 'above',
  下: 'below',
  左: 'left',
  右: 'right',
  王: 'king',
  玉: 'jewel',
  白: 'white',
  黒: 'black',
  赤: 'red',
  青: 'blue',
  糸: 'thread',
  言: 'speech',
  貝: 'shell',
  竹: 'bamboo',
  草: 'grass',
  花: 'flower',
  虫: 'insect',
  鳥: 'bird',
  魚: 'fish',
  犬: 'dog',
  馬: 'horse',
  牛: 'cow',
  羊: 'sheep',
  門: 'gate',
  車: 'vehicle',
  刀: 'blade',
  又: 'again',
  弓: 'bow',
  夕: 'evening',
  米: 'rice',
  生: 'life',
  先: 'ahead',
  文: 'writing',
  立: 'stand',
  正: 'correct',
  円: 'circle',
  回: 'around',
  品: 'goods',
  晶: 'sparkle',
  音: 'sound',
  友: 'friend',
  亻: 'person form',
  氵: 'water form',
  扌: 'hand form',
  忄: 'heart form',
  艹: 'grass form',
  灬: 'fire form',
  辶: 'walk form',
  阝: 'mound / city form'
};
type Feedback = { message: string; outputs: string[]; newDiscoveries: string[] };
type LibraryTab = 'seeds' | 'discoveries' | 'all';

function initialProgress(
  content: AlchemyBundle,
  arity: MergeArity,
  progression: AlchemyProgression
) {
  try {
    return {
      journey: readAlchemyJourney(
        localStorage.getItem(`${STORAGE_KEY}.levels-v1.${arity}`),
        content,
        progression
      ),
      warning: ''
    };
  } catch {
    return {
      journey: createAlchemyJourney(content, progression),
      warning:
        'This browser could not read your saved collection. You can still play in this session.'
    };
  }
}

export function App() {
  const [content, setContent] = useState<AlchemyBundle | null>(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setError('');
    async function load() {
      try {
        const response = await fetch(`${import.meta.env.BASE_URL}data/alchemy.json`, {
          signal: controller.signal
        });
        if (!response.ok) throw new Error(`Content request failed (${response.status})`);
        const value: unknown = await response.json();
        const bundle = loadAlchemyContent(value);
        if (!controller.signal.aborted) setContent(bundle);
      } catch (cause) {
        if (!controller.signal.aborted)
          setError(cause instanceof Error ? cause.message : 'The collection could not be loaded.');
      }
    }
    void load();
    return () => controller.abort();
  }, [attempt]);
  if (content) return <AlchemyModes content={content} />;
  return (
    <main className={styles.loadingPage}>
      <div className={styles.loadingSeal} aria-hidden="true">
        合
      </div>
      <p className={styles.eyebrow}>A little laboratory of written forms</p>
      <h1>Kanji Alchemy</h1>
      {error ? (
        <>
          <p role="alert">The collection could not be opened. {error}</p>
          <button className={styles.primaryButton} onClick={() => setAttempt((value) => value + 1)}>
            Try again
          </button>
        </>
      ) : (
        <p role="status">Opening the collection…</p>
      )}
    </main>
  );
}

function AlchemyModes({ content }: { content: AlchemyBundle }) {
  const modes = useMemo(
    () =>
      MERGE_MODES.map((arity) => {
        const mode = createAlchemyMode(content, arity);
        return { arity, content: mode, progression: createAlchemyProgression(mode) };
      }),
    [content]
  );
  const [arity, setArity] = useState<MergeArity>(2);
  const previousArity = useRef(arity);
  const activeModeButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (previousArity.current !== arity) {
      activeModeButton.current?.focus({ preventScroll: true });
      previousArity.current = arity;
    }
  }, [arity]);
  const [collections, setCollections] = useState(() =>
    modes.map((mode) => initialProgress(mode.content, mode.arity, mode.progression))
  );
  const index = MERGE_MODES.indexOf(arity);
  return (
    <Alchemy
      key={arity}
      content={modes[index].content}
      progression={modes[index].progression}
      arity={arity}
      onModeChange={setArity}
      activeModeButton={activeModeButton}
      journey={collections[index].journey}
      initialWarning={collections[index].warning}
      onJourneyChange={(journey) =>
        setCollections((current) =>
          current.map((collection, position) =>
            position === index ? { ...collection, journey } : collection
          )
        )
      }
    />
  );
}

function Alchemy({
  content,
  progression,
  arity,
  onModeChange,
  activeModeButton,
  journey,
  initialWarning,
  onJourneyChange
}: {
  content: AlchemyBundle;
  progression: AlchemyProgression;
  arity: MergeArity;
  onModeChange: (arity: MergeArity) => void;
  activeModeButton: RefObject<HTMLButtonElement>;
  journey: AlchemyJourney;
  initialWarning: string;
  onJourneyChange: (journey: AlchemyJourney) => void;
}) {
  const { unlocked } = journey;
  const level = progression.levels[journey.level];
  const nextLevel = progression.levels[journey.level + 1];
  const [storageWarning, setStorageWarning] = useState(initialWarning);
  const [slots, setSlots] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<LibraryTab>('seeds');
  const [levelFilter, setLevelFilter] = useState(
    journey.level === 0 ? 'all' : String(journey.level)
  );
  const [reusableOnly, setReusableOnly] = useState(false);
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [selected, setSelected] = useState<string | null>(null);
  const [hintCursor, setHintCursor] = useState(0);
  const [hintVisible, setHintVisible] = useState(false);
  const [dragPreview, setDragPreview] = useState<{ id: string; x: number; y: number } | null>(null);
  const dragStart = useRef<{ id: string; x: number; y: number; moved: boolean } | null>(null);
  const suppressClick = useRef(false);
  const dropArea = useRef<HTMLDivElement>(null);
  const resetDialog = useRef<HTMLDialogElement>(null);
  const inventory = useMemo(() => new Set(unlocked), [unlocked]);
  const seedSet = useMemo(() => new Set(level.seeds), [level]);
  const visibleIds = useMemo(() => new Set(level.reachable), [level]);
  const reusableIds = useMemo(
    () => new Set(content.recipes.flatMap((recipe) => recipe.components)),
    [content]
  );
  const elements = useMemo(
    () => new Map(content.elements.map((element) => [element.id, element])),
    [content]
  );
  const glyph = (id: string) => elements.get(id)?.glyph ?? id;
  const label = (id: string) => labels[elements.get(id)?.glyph ?? id];
  const discoveries = unlocked.filter((id) => !seedSet.has(id));
  const discoverableCount = level.reachable.length - seedSet.size;
  const progress =
    discoverableCount === 0 ? 100 : Math.round((discoveries.length / discoverableCount) * 100);
  const kanjiDiscoveries = discoveries.filter((id) => elements.get(id)?.kind === 'kanji').length;

  useEffect(() => {
    try {
      localStorage.setItem(
        `${STORAGE_KEY}.levels-v1.${arity}`,
        serializeAlchemyJourney(journey, content, progression)
      );
    } catch {
      setStorageWarning(
        'Your browser cannot save progress. Keep this tab open to preserve this session.'
      );
    }
  }, [journey, content, progression, arity]);

  const sortedElements = useMemo(() => {
    const frequency = new Map<string, number>();
    for (const recipe of content.recipes)
      for (const component of recipe.components)
        frequency.set(component, (frequency.get(component) ?? 0) + 1);
    return [...content.elements].sort(
      (a, b) =>
        Number(Boolean(labels[b.glyph])) - Number(Boolean(labels[a.glyph])) ||
        (frequency.get(b.id) ?? 0) - (frequency.get(a.id) ?? 0) ||
        a.id.localeCompare(b.id)
    );
  }, [content]);
  const filteredElements = sortedElements.filter((element) => {
    if (!visibleIds.has(element.id)) return false;
    if (levelFilter !== 'all' && progression.elementLevels[element.id] !== Number(levelFilter))
      return false;
    if (reusableOnly && !reusableIds.has(element.id)) return false;
    if (tab === 'seeds' && !seedSet.has(element.id)) return false;
    if (tab === 'discoveries' && (!inventory.has(element.id) || seedSet.has(element.id)))
      return false;
    const search = query.trim().toLocaleLowerCase();
    return (
      !search || element.glyph.includes(search) || (labels[element.glyph] ?? '').includes(search)
    );
  });
  const craftable = useMemo(
    () =>
      getCraftableRecipes(content, inventory).sort(
        (a, b) =>
          Number(reusableIds.has(b.output)) - Number(reusableIds.has(a.output)) ||
          a.components.length - b.components.length ||
          b.components.filter((id) => labels[elements.get(id)?.glyph ?? id]).length -
            a.components.filter((id) => labels[elements.get(id)?.glyph ?? id]).length
      ),
    [content, inventory, elements, reusableIds]
  );
  const hint = craftable.length ? craftable[hintCursor % craftable.length] : undefined;
  const selectedElement = selected ? elements.get(selected) : undefined;
  const selectedRecipes = selected
    ? content.recipes.filter(
        (recipe) =>
          recipe.output === selected && recipe.components.every((id) => visibleIds.has(id))
      )
    : [];

  function addElement(id: string) {
    if (!inventory.has(id)) return;
    setSlots((current) => (current.length < arity ? [...current, id] : current));
    setFeedback(null);
  }
  function merge() {
    if (slots.length !== arity) return;
    const result = mergeAlchemy({ components: slots, inventory, content });
    if (result.success) {
      onJourneyChange({
        ...journey,
        unlocked: [...new Set([...unlocked, ...result.newDiscoveries])]
      });
      setFeedback({
        message: result.newDiscoveries.length
          ? `${result.newDiscoveries.length === 1 ? 'A new discovery' : `${result.newDiscoveries.length} new discoveries`}. Beautifully put together.`
          : 'A familiar combination. These forms are already in your collection.',
        outputs: result.outputs,
        newDiscoveries: result.newDiscoveries
      });
      setSelected(result.newDiscoveries[0] ?? result.outputs[0] ?? null);
      setHintVisible(false);
    } else
      setFeedback({
        message:
          result.reason === 'arity'
            ? `Choose exactly ${arity} elements to combine.`
            : result.reason === 'locked'
              ? 'One of these elements is not in your collection yet.'
              : 'No recorded combination yet. Try different elements, or ask for a hint.',
        outputs: [],
        newDiscoveries: []
      });
  }
  function reset() {
    onJourneyChange(createAlchemyJourney(content, progression));
    setSlots([]);
    setFeedback(null);
    setSelected(null);
    setHintVisible(false);
    setTab('seeds');
    setLevelFilter('all');
    setReusableOnly(false);
    setQuery('');
    setLimit(PAGE_SIZE);
    resetDialog.current?.close();
  }

  function advanceLevel() {
    const next = advanceAlchemyJourney(journey, content, progression);
    if (next.level === journey.level) return;
    onJourneyChange(next);
    setSlots([]);
    setFeedback(null);
    setSelected(null);
    setHintVisible(false);
    setHintCursor(0);
    setTab('seeds');
    setLevelFilter(String(next.level));
    setReusableOnly(false);
    setQuery('');
    setLimit(PAGE_SIZE);
  }

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <a className={styles.brand} href="#main" aria-label="Kanji Alchemy, skip to laboratory">
          <span className={styles.seal} aria-hidden="true">
            合
          </span>
          <span>
            kanji<span className={styles.brandAccent}>alchemy</span>
          </span>
        </a>
        <div className={styles.headerNote}>
          A study in small beginnings<span>漢字の実験室</span>
        </div>
        <span className={styles.prototype}>PROTOTYPE · 01</span>
      </header>
      <main id="main" className={styles.main}>
        <section className={styles.introduction} aria-labelledby="page-title">
          <div>
            <p className={styles.eyebrow}>The character laboratory</p>
            <h1 id="page-title">
              Small parts. <em>New possibilities.</em>
            </h1>
            <p>Bring elements together. Discover the kanji hidden between them.</p>
          </div>
          <div className={styles.progressCard}>
            <div className={styles.progressNumbers}>
              <strong>{discoveries.length.toLocaleString()}</strong>
              <span>/ {discoverableCount.toLocaleString()} discoveries in reach</span>
              <span>{progress}%</span>
            </div>
            <progress
              value={discoveries.length}
              max={Math.max(1, discoverableCount)}
              aria-label="Discovery progress"
            />
            <span>
              {kanjiDiscoveries.toLocaleString()} kanji found ·{' '}
              {level.seeds.length.toLocaleString()} starting pieces · Level {journey.level + 1}
            </span>
          </div>
        </section>
        <section className={styles.modeSection} aria-label="Merge mode">
          <div className={styles.modeSwitcher} role="group" aria-label="Number of parts per merge">
            {MERGE_MODES.map((value) => (
              <button
                key={value}
                ref={arity === value ? activeModeButton : undefined}
                aria-pressed={arity === value}
                onClick={() => onModeChange(value)}
              >
                <strong>{value}-part merges</strong>
                <span>
                  {value === 2
                    ? 'Classic alchemy'
                    : value === 3
                      ? 'Three-part experiments'
                      : 'Four to explore'}
                </span>
              </button>
            ))}
          </div>
          <p>Every mode is open. Each has its own levels and saved discoveries.</p>
        </section>
        <section className={styles.levelPanel} aria-labelledby="level-title">
          <div>
            <p className={styles.eyebrow}>
              Level {journey.level + 1} of {progression.levels.length}
            </p>
            <h2 id="level-title">
              {journey.level === 0 ? 'Small beginnings' : 'Build on what you know'}
            </h2>
            <p>
              {journey.level === 0
                ? `Begin with ${level.seeds.length} useful pieces.`
                : `${level.newSeeds.length} new starting pieces. Every earlier discovery stays yours.`}{' '}
              Explore {discoverableCount.toLocaleString()} possible discoveries by combining and
              reusing forms.
            </p>
          </div>
          <div className={styles.levelActions}>
            {nextLevel ? (
              <>
                <span role="status">
                  {Math.min(discoveries.length, level.discoveryTarget)} / {level.discoveryTarget}{' '}
                  discoveries to open Level {journey.level + 2}
                </span>
                <progress
                  value={Math.min(discoveries.length, level.discoveryTarget)}
                  max={Math.max(1, level.discoveryTarget)}
                  aria-label="Next level progress"
                />
                <button
                  className={styles.primaryButton}
                  disabled={discoveries.length < level.discoveryTarget}
                  onClick={advanceLevel}
                >
                  Open Level {journey.level + 2} · +{nextLevel.newSeeds.length} pieces
                </button>
                <small>No need to find every combination. Repeated discoveries don’t count.</small>
              </>
            ) : (
              <p>All levels are open. Keep exploring the collection.</p>
            )}
          </div>
        </section>
        {storageWarning && (
          <p className={styles.warning} role="status">
            {storageWarning}
          </p>
        )}
        <div className={styles.workspace}>
          <section className={styles.library} aria-labelledby="library-title">
            <div className={styles.sectionHeader}>
              <div>
                <p className={styles.eyebrow}>01 / Your collection</p>
                <h2 id="library-title">The elements</h2>
              </div>
              <span className={styles.countBadge}>
                {unlocked.length.toLocaleString()} available
              </span>
            </div>
            <label className={styles.search}>
              <span aria-hidden="true">⌕</span>
              <span className={styles.srOnly}>Search by character or a common English label</span>
              <input
                type="search"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setLimit(PAGE_SIZE);
                }}
                placeholder="Find a character or try “tree”…"
              />
            </label>
            <div className={styles.tabs} aria-label="Collection filters">
              {(
                [
                  ['seeds', 'Starting elements'],
                  ['discoveries', 'Discoveries'],
                  ['all', 'All forms']
                ] as const
              ).map(([value, title]) => (
                <button
                  key={value}
                  aria-pressed={tab === value}
                  className={tab === value ? styles.activeTab : ''}
                  onClick={() => {
                    setTab(value);
                    setLevelFilter('all');
                    setLimit(PAGE_SIZE);
                  }}
                >
                  {title}
                </button>
              ))}
            </div>
            <div className={styles.collectionGroups}>
              <label>
                Introduced in
                <select
                  aria-label="Filter collection by level"
                  value={levelFilter}
                  onChange={(event) => {
                    setLevelFilter(event.target.value);
                    setLimit(PAGE_SIZE);
                  }}
                >
                  <option value="all">All open levels</option>
                  {progression.levels.slice(0, journey.level + 1).map((entry) => (
                    <option key={entry.index} value={entry.index}>
                      Level {entry.index + 1}
                      {entry.index === journey.level ? ' · current' : ''}
                    </option>
                  ))}
                </select>
              </label>
              <button
                aria-pressed={reusableOnly}
                onClick={() => {
                  setReusableOnly((current) => !current);
                  setLimit(PAGE_SIZE);
                }}
              >
                Building blocks only
              </button>
            </div>
            <div className={styles.libraryHelp}>
              <span>
                {filteredElements.length.toLocaleString()}{' '}
                {tab === 'all' ? 'forms · locked forms are previewable' : 'elements'}
                {query && ' matching your search'}
              </span>
              <span>Click or drag to add ↗</span>
            </div>
            <div className={styles.elementGrid}>
              {filteredElements.slice(0, limit).map((element) => {
                const available = inventory.has(element.id);
                const displayLabel = labels[element.glyph];
                return (
                  <div
                    key={element.id}
                    className={`${styles.elementCard} ${available ? '' : styles.lockedCard} ${selected === element.id ? styles.selectedCard : ''}`}
                  >
                    <button
                      className={styles.elementAdd}
                      onPointerDown={(event) => {
                        if (!available || event.pointerType === 'touch' || event.button !== 0)
                          return;
                        event.currentTarget.setPointerCapture(event.pointerId);
                        dragStart.current = {
                          id: element.id,
                          x: event.clientX,
                          y: event.clientY,
                          moved: false
                        };
                      }}
                      onPointerMove={(event) => {
                        const start = dragStart.current;
                        if (!start) return;
                        if (Math.hypot(event.clientX - start.x, event.clientY - start.y) > 6)
                          start.moved = true;
                        if (start.moved)
                          setDragPreview({ id: start.id, x: event.clientX, y: event.clientY });
                      }}
                      onPointerUp={(event) => {
                        const start = dragStart.current;
                        const bounds = dropArea.current?.getBoundingClientRect();
                        if (start?.moved) {
                          suppressClick.current = true;
                          if (
                            bounds &&
                            event.clientX >= bounds.left &&
                            event.clientX <= bounds.right &&
                            event.clientY >= bounds.top &&
                            event.clientY <= bounds.bottom
                          )
                            addElement(start.id);
                        }
                        dragStart.current = null;
                        setDragPreview(null);
                      }}
                      onPointerCancel={() => {
                        dragStart.current = null;
                        setDragPreview(null);
                      }}
                      onClick={() => {
                        if (suppressClick.current) {
                          suppressClick.current = false;
                          return;
                        }
                        if (available) addElement(element.id);
                        else setSelected(element.id);
                      }}
                      aria-label={
                        available
                          ? `Add ${element.glyph}${displayLabel ? `, ${displayLabel}` : ''} to workbench`
                          : `Inspect locked form ${element.glyph}`
                      }
                      disabled={available && slots.length === arity}
                    >
                      <span className={styles.kanji}>{element.glyph}</span>
                      <span className={styles.elementLabel}>
                        {displayLabel ?? (element.kind === 'component' ? 'component' : 'kanji')}
                      </span>
                    </button>
                    <button
                      className={styles.inspectButton}
                      onClick={() => setSelected(element.id)}
                      aria-label={`Details for ${element.glyph}`}
                    >
                      {available ? '↗' : '○'}
                    </button>
                  </div>
                );
              })}
            </div>
            {filteredElements.length === 0 && (
              <div className={styles.emptyState}>
                <span aria-hidden="true">◌</span>
                <h3>
                  {query || levelFilter !== 'all' || reusableOnly
                    ? 'No matching forms'
                    : 'Your next discovery starts here'}
                </h3>
                <p>
                  {query || levelFilter !== 'all' || reusableOnly
                    ? 'Try another level or clear the filters to see more of your collection.'
                    : 'Combine starting elements on the workbench. New forms will appear in this collection.'}
                </p>
                {!query && levelFilter === 'all' && !reusableOnly && (
                  <button
                    className={styles.textButton}
                    onClick={() => {
                      setTab('seeds');
                      setHintVisible(true);
                    }}
                  >
                    Explore starting elements →
                  </button>
                )}
                {(query || levelFilter !== 'all' || reusableOnly) && (
                  <button
                    className={styles.textButton}
                    onClick={() => {
                      setQuery('');
                      setLevelFilter('all');
                      setReusableOnly(false);
                      setLimit(PAGE_SIZE);
                    }}
                  >
                    Clear filters →
                  </button>
                )}
              </div>
            )}
            {filteredElements.length > limit && (
              <button
                className={styles.loadMore}
                onClick={() => setLimit((current) => current + PAGE_SIZE)}
              >
                Show {Math.min(PAGE_SIZE, filteredElements.length - limit)} more <span>↓</span>
              </button>
            )}
            <p className={styles.libraryFootnote}>
              Building blocks are forms you can reuse in further recipes. English labels are a
              small, hand-written search aid. Unlabelled shapes are still playable.
            </p>
          </section>
          <div className={styles.rightColumn}>
            <section className={styles.workbench} aria-labelledby="workbench-title">
              <div className={styles.sectionHeader}>
                <div>
                  <p className={styles.eyebrow}>02 / Put things together</p>
                  <h2 id="workbench-title">The workbench</h2>
                </div>
                <span className={styles.workbenchMark} aria-hidden="true">
                  合
                </span>
              </div>
              <p className={styles.workbenchDescription}>
                Exactly {arity} parts.{' '}
                {arity === 2 ? 'Classic alchemy, one pair at a time.' : 'A little curiosity.'}
              </p>
              <div
                ref={dropArea}
                className={`${styles.slotArea} ${dragPreview ? styles.dragging : ''}`}
              >
                <div
                  className={styles.slots}
                  style={{ gridTemplateColumns: `repeat(${arity}, minmax(0, 1fr))` }}
                >
                  {Array.from({ length: arity }, (_, index) => {
                    const id = slots[index];
                    return id ? (
                      <button
                        key={index}
                        className={styles.filledSlot}
                        onClick={() => {
                          setSlots((current) => current.filter((_, slot) => slot !== index));
                          setFeedback(null);
                        }}
                        aria-label={`Remove ${glyph(id)} from slot ${index + 1}`}
                      >
                        <span>{glyph(id)}</span>
                        <small>×</small>
                      </button>
                    ) : (
                      <div key={index} className={styles.emptySlot}>
                        <span aria-hidden="true">+</span>
                        <small>PART {index + 1}</small>
                      </div>
                    );
                  })}
                </div>
                <p>
                  {slots.length === 0
                    ? 'Choose elements from your collection'
                    : `${slots.length} of ${arity} parts · click a part to remove it`}
                </p>
              </div>
              <div className={styles.combineActions}>
                <button
                  className={styles.primaryButton}
                  disabled={slots.length !== arity}
                  onClick={merge}
                >
                  Combine elements <span aria-hidden="true">↗</span>
                </button>
                <button
                  className={styles.clearButton}
                  onClick={() => {
                    setSlots([]);
                    setFeedback(null);
                  }}
                  disabled={slots.length === 0}
                >
                  Clear
                </button>
              </div>
              <div className={styles.feedback} role="status" aria-live="polite" aria-atomic="true">
                {feedback ? (
                  <>
                    <p>{feedback.message}</p>
                    {feedback.outputs.length > 0 && (
                      <div className={styles.resultCards}>
                        {feedback.outputs.map((id) => (
                          <button
                            key={id}
                            onClick={() => setSelected(id)}
                            aria-label={`Inspect ${glyph(id)} result`}
                          >
                            <span>{glyph(id)}</span>
                            <small>{feedback.newDiscoveries.includes(id) ? 'NEW' : 'KNOWN'}</small>
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <p>
                    Elements are reusable. Try the same one twice.
                    <br />
                    Order does not matter; repeated parts do.
                  </p>
                )}
              </div>
              <div className={styles.hintArea}>
                <button
                  className={styles.hintToggle}
                  onClick={() => setHintVisible((current) => !current)}
                  aria-expanded={hintVisible}
                >
                  <span>✧</span> A nudge in the right direction{' '}
                  <span>{hintVisible ? '−' : '+'}</span>
                </button>
                {hintVisible && (
                  <div className={styles.hintBody}>
                    {hint ? (
                      <>
                        <p>There is an undiscovered form you can make with:</p>
                        <div className={styles.hintParts}>
                          {hint.components.map((id, index) => (
                            <span key={`${id}-${index}`}>{glyph(id)}</span>
                          ))}
                        </div>
                        <div className={styles.hintActions}>
                          <button
                            onClick={() => {
                              setSlots([...hint.components]);
                              setFeedback(null);
                            }}
                          >
                            Try these parts ↗
                          </button>
                          <button onClick={() => setHintCursor((current) => current + 1)}>
                            Another hint
                          </button>
                        </div>
                      </>
                    ) : (
                      <p>
                        {discoveries.length === discoverableCount
                          ? 'Every form is in your collection. The laboratory is complete.'
                          : 'No new combinations are available with this collection.'}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </section>
            {selectedElement && (
              <section className={styles.detail} aria-labelledby="detail-title">
                <div className={styles.detailHeading}>
                  <span className={styles.detailGlyph}>{selectedElement.glyph}</span>
                  <div>
                    <p className={styles.eyebrow}>Under the lens</p>
                    <h3 id="detail-title">
                      {label(selectedElement.id) ??
                        (selectedElement.kind === 'kanji' ? 'Kanji form' : 'Written component')}
                    </h3>
                    <p>
                      {seedSet.has(selectedElement.id)
                        ? 'Starting element'
                        : inventory.has(selectedElement.id)
                          ? 'In your collection'
                          : 'Not yet discovered'}
                    </p>
                    <p>
                      {reusableIds.has(selectedElement.id)
                        ? 'Building block · reusable in further recipes'
                        : 'Collection discovery'}
                    </p>
                  </div>
                  <button
                    className={styles.closeButton}
                    onClick={() => setSelected(null)}
                    aria-label="Close element details"
                  >
                    ×
                  </button>
                </div>
                {inventory.has(selectedElement.id) && (
                  <button
                    className={styles.textButton}
                    disabled={slots.length === arity}
                    onClick={() => addElement(selectedElement.id)}
                  >
                    Add to workbench →
                  </button>
                )}
                {seedSet.has(selectedElement.id) && (
                  <p className={styles.atomicReason}>
                    Introduced as a starting piece in Level{' '}
                    {(progression.elementLevels[selectedElement.id] ?? 0) + 1} of {arity}-part mode.
                    Starting pieces can differ between modes.
                  </p>
                )}
                {selectedRecipes.length > 0 && (
                  <div className={styles.recipeDetails}>
                    <h4>Recorded combinations</h4>
                    {selectedRecipes.slice(0, 8).map((recipe) => (
                      <div key={recipe.id}>
                        <p className={styles.recipeEquation}>
                          {recipe.components.map(glyph).join(' + ')} <span>→</span>{' '}
                          {selectedElement.glyph}
                        </p>
                        <p>Source forms: {recipe.originalComponents.join(' + ')}</p>
                        <a
                          href={`${content.source.url.replace(/\/$/, '')}/blob/${content.source.revision}/kanji/${recipe.source.file}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          View source · {recipe.source.nodeId} ↗
                        </a>
                      </div>
                    ))}
                    {selectedRecipes.length > 8 && (
                      <p>
                        {selectedRecipes.length - 8} more recorded combinations in the downloadable
                        data.
                      </p>
                    )}
                  </div>
                )}
              </section>
            )}
            <section className={styles.journal} aria-labelledby="journal-title">
              <div className={styles.journalHeading}>
                <h3 id="journal-title">Field notes</h3>
                <span>{discoveries.length ? 'LATEST DISCOVERIES' : 'A CLEAN PAGE'}</span>
              </div>
              {discoveries.length > 0 ? (
                <div className={styles.journalEntries}>
                  {discoveries
                    .slice(-8)
                    .reverse()
                    .map((id) => (
                      <button
                        key={id}
                        onClick={() => setSelected(id)}
                        aria-label={`Inspect discovery ${glyph(id)}`}
                      >
                        <span>{glyph(id)}</span>
                        <small>{label(id) ?? 'discovered'}</small>
                      </button>
                    ))}
                </div>
              ) : (
                <p>
                  Your discoveries will find a home here.
                  <br />
                  Every character begins with a few small parts.
                </p>
              )}
            </section>
            <details className={styles.instructions}>
              <summary>
                How to play <span aria-hidden="true">+</span>
              </summary>
              <ol>
                <li>
                  Click or drag a starting element into the workbench. Each element can be used more
                  than once.
                </li>
                <li>
                  Combine exactly {arity} parts. Matching recorded recipes unlock every resulting
                  form.
                </li>
                <li>Find your new forms in Discoveries and reuse them to build further.</li>
                <li>Need a start? Open a hint to find a combination you can already make.</li>
                <li>
                  Discover new forms to open the next level and add a small set of starting pieces.
                  Earlier discoveries remain reusable.
                </li>
                <li>
                  Use level groups and the building-block filter as your collection grows. Switch
                  merge modes any time; each journey saves separately.
                </li>
              </ol>
              <p>
                Part order is ignored. Some written variants are normalized to a shared element;
                original source forms remain visible in each recipe. Progress is saved in this
                browser when storage is available.
              </p>
            </details>
          </div>
        </div>
        <section className={styles.methodNote} aria-label="About this collection">
          <div>
            <p className={styles.eyebrow}>A finite collection. An open notebook.</p>
            <h3>Written forms, made explorable.</h3>
            <p>
              This {arity}-part collection covers {content.stats.kanji.toLocaleString()}{' '}
              source-covered kanji and {content.stats.elements.toLocaleString()} total elements,
              with {content.stats.recipes.toLocaleString()} recorded recipes. It is not a claim to
              cover every kanji. Open further levels to gradually reach all{' '}
              {content.stats.reachable.toLocaleString()} included elements.
            </p>
          </div>
          <div className={styles.sourceNote}>
            <a href={content.source.url} target="_blank" rel="noreferrer">
              {content.source.name} ↗
            </a>
            <span>© Ulrich Apel and KanjiVG contributors</span>
            <a
              href="https://creativecommons.org/licenses/by-sa/3.0/"
              target="_blank"
              rel="noreferrer"
            >
              Adapted data: {content.source.license}
            </a>
            <span>Collection {content.contentVersion}</span>
            <a href={`${import.meta.env.BASE_URL}data/NOTICE.md`}>
              Attribution & transformation notes ↗
            </a>
            <a href={`${import.meta.env.BASE_URL}data/alchemy.json`} download>
              Download recipes & provenance ↓
            </a>
          </div>
        </section>
        <footer className={styles.footer}>
          <p>Recipes model written forms, not historical etymology.</p>
          <button onClick={() => resetDialog.current?.showModal()}>
            Reset {arity}-part journey
          </button>
        </footer>
      </main>
      {dragPreview && (
        <div
          className={styles.dragPreview}
          style={{ left: dragPreview.x, top: dragPreview.y }}
          aria-hidden="true"
        >
          {glyph(dragPreview.id)}
        </div>
      )}
      <dialog ref={resetDialog} className={styles.resetDialog} aria-labelledby="reset-title">
        <h2 id="reset-title">Begin again?</h2>
        <p>
          This resets your {arity}-part levels and discoveries to Level 1 with{' '}
          {progression.levels[0].seeds.length} starting pieces. Your other modes are unchanged.
        </p>
        <div>
          <button
            className={styles.clearButton}
            autoFocus
            onClick={() => resetDialog.current?.close()}
          >
            Keep exploring
          </button>
          <button className={styles.primaryButton} onClick={reset}>
            Reset collection
          </button>
        </div>
      </dialog>
    </div>
  );
}
