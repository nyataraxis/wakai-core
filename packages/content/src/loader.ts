import { ContentSchema, type Content } from './schema'

export interface ContentCache {
  get: (key: string) => Promise<Content | null>
  set: (key: string, value: Content) => Promise<void>
}

export interface RemoteContentSource {
  cacheKey: string
  fetchContent: () => Promise<unknown>
  cache?: ContentCache
}

const parseJsonIfString = (value: unknown): unknown => {
  if (typeof value !== 'string') {
    return value
  }
  return JSON.parse(value)
}

export const loadEmbeddedContent = (value: unknown): Content => {
  const parsed = parseJsonIfString(value)
  return ContentSchema.parse(parsed)
}

export const loadRemoteContent = async (source: RemoteContentSource): Promise<Content> => {
  const cached = source.cache ? await source.cache.get(source.cacheKey) : null
  if (cached) {
    return cached
  }
  const data = await source.fetchContent()
  const parsed = loadEmbeddedContent(data)
  if (source.cache) {
    await source.cache.set(source.cacheKey, parsed)
  }
  return parsed
}
