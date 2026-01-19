import type { ContentBundle, ContentMeta, ContentVersion } from './schema'

const DEFAULT_VERSION: ContentVersion = '0.1.0'
const DEFAULT_UPDATED_AT = '1970-01-01T00:00:00.000Z'

export const createContentMeta = (version: ContentVersion = DEFAULT_VERSION): ContentMeta => {
  return {
    version,
    updatedAt: DEFAULT_UPDATED_AT
  }
}

export const loadContent = (bundle: ContentBundle): ContentBundle => {
  if (!bundle.meta || !bundle.elements || !bundle.rules) {
    throw new Error('Invalid content bundle')
  }
  return bundle
}
