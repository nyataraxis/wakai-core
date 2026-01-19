import type { ContentVersion } from './schema'

const VERSION_DELIMITER = '.'
const SEGMENT_COUNT = 3

const parseVersion = (version: ContentVersion): number[] => {
  const parts = version.split(VERSION_DELIMITER)
  if (parts.length !== SEGMENT_COUNT) {
    return [0, 0, 0]
  }
  return parts.map((part) => Number(part))
}

export const isCompatible = (current: ContentVersion, incoming: ContentVersion): boolean => {
  const [currentMajor] = parseVersion(current)
  const [incomingMajor] = parseVersion(incoming)
  return currentMajor === incomingMajor
}
