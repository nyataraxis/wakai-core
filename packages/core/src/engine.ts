/** Element identifiers stored in player inventory. */
export type ElementId = string
/** Kanji output identifiers produced by fusions. */
export type KanjiId = string
/** Component identifiers used to build signatures. */
export type ComponentId = string

/** Map of signature strings to resulting kanji ids. */
export type FusionIndex = ReadonlyMap<string, KanjiId>

/** Mapping table for normalizing components before signatures. */
export type NormalizationTable = Readonly<Record<ComponentId, ComponentId>>

/** Persisted player state. */
export interface PlayerState {
  unlocked: ElementId[]
  xp: number
}

/** Successful fusion result. */
export interface FusionSuccess {
  success: true
  output: KanjiId
  signature: string
  unlockDelta: ElementId[]
  xpDelta: number
}

/** Failed fusion result. */
export interface FusionFailure {
  success: false
  signature: string
  unlockDelta: ElementId[]
  xpDelta: number
}

export type FusionResult = FusionSuccess | FusionFailure

/** Inputs for a fusion attempt. */
export interface FusionOptions {
  inventory: ReadonlySet<ElementId>
  components: [ComponentId, ComponentId]
  normalizationMap: NormalizationTable
  fusionIndex: FusionIndex
  xpOnSuccess?: number
  xpOnFailure?: number
}

const SIGNATURE_SEPARATOR = '|'
const DEFAULT_XP_ON_SUCCESS = 1
const DEFAULT_XP_ON_FAILURE = 0
const INITIAL_XP = 0

/** Create a deterministic signature from components and normalization. */
export const createSignature = (
  components: ComponentId[],
  normalizationMap: NormalizationTable
): string => {
  const normalized = components.map((component) => normalizeComponent(component, normalizationMap))
  const sorted = [...normalized].sort(compareComponents)
  return sorted.join(SIGNATURE_SEPARATOR)
}

/** Attempt a fusion with inventory and content mappings. */
export const fuse = ({
  inventory,
  components,
  normalizationMap,
  fusionIndex,
  xpOnSuccess,
  xpOnFailure
}: FusionOptions): FusionResult => {
  const signature = createSignature(components, normalizationMap)
  const output = fusionIndex.get(signature)
  if (!output) {
    return {
      success: false,
      signature,
      unlockDelta: [],
      xpDelta: xpOnFailure ?? DEFAULT_XP_ON_FAILURE
    }
  }

  return {
    success: true,
    output,
    signature,
    unlockDelta: inventory.has(output) ? [] : [output],
    xpDelta: xpOnSuccess ?? DEFAULT_XP_ON_SUCCESS
  }
}

/** Serialize player state to JSON. */
export const serializePlayerState = (state: PlayerState): string => JSON.stringify(state)

/** Deserialize player state from JSON. */
export const deserializePlayerState = (value: string): PlayerState => {
  const parsed = safeParse(value)
  return {
    unlocked: Array.isArray(parsed?.unlocked)
      ? parsed.unlocked.map((entry) => String(entry))
      : [],
    xp: typeof parsed?.xp === 'number' ? parsed.xp : INITIAL_XP
  }
}

const normalizeComponent = (
  component: ComponentId,
  normalizationMap: NormalizationTable
): ComponentId => normalizationMap[component] ?? component

const compareComponents = (left: ComponentId, right: ComponentId): number => {
  if (left === right) {
    return 0
  }
  return left < right ? -1 : 1
}

const safeParse = (value: string): Partial<PlayerState> | null => {
  try {
    return JSON.parse(value) as Partial<PlayerState>
  } catch {
    return null
  }
}
