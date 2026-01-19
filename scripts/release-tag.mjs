import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const packageJsonPath = resolve(process.cwd(), 'package.json')
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'))
const version = packageJson.version ?? '0.1.0'
const tagName = `v${version}`

execSync(`git tag ${tagName}`, { stdio: 'inherit' })
execSync('git push --tags', { stdio: 'inherit' })
