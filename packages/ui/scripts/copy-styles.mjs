import { cp, mkdir } from 'node:fs/promises'

const sourceDir = new URL('../src/styles/', import.meta.url)
const targetDir = new URL('../dist/styles/', import.meta.url)

await mkdir(targetDir, { recursive: true })
await cp(sourceDir, targetDir, { recursive: true })
