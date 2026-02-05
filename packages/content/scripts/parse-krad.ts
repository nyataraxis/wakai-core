import { readFile } from 'node:fs/promises'

const LINE_SEPARATOR = '\n'
const COMMENT_PREFIXES = ['#', ';']
const ENTRY_SEPARATOR = ':'

const isCommentLine = (line: string): boolean =>
  COMMENT_PREFIXES.some((prefix) => line.startsWith(prefix))

export const parseKradFile = async (filePath: string): Promise<Record<string, string[]>> => {
  const text = await readFile(filePath, 'utf8')
  const lines = text.split(LINE_SEPARATOR)
  const result: Record<string, string[]> = {}
  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line || isCommentLine(line)) {
      continue
    }
    const separatorIndex = line.indexOf(ENTRY_SEPARATOR)
    if (separatorIndex === -1) {
      continue
    }
    const kanji = line.slice(0, separatorIndex).trim()
    const componentsPart = line.slice(separatorIndex + ENTRY_SEPARATOR.length).trim()
    if (!kanji || !componentsPart) {
      continue
    }
    const components = componentsPart
      .split(/\s+/u)
      .map((entry) => entry.trim())
      .filter((entry) => entry.length === 1)
    if (components.length > 0) {
      result[kanji] = components
    }
  }
  return result
}
