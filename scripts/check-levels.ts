#!/usr/bin/env tsx
/**
 * 关卡配置检查脚本 - CI 门禁 & 开发者自检
 *
 * 用途：新增/修改关卡后运行此脚本，确保所有关卡配置合法。
 * 运行：pnpm check:levels
 *
 * 检查项：
 *   1. 所有 JSON 能正确解析
 *   2. LevelValidator 校验零 error
 *   3. ID 命名规范 (level-XXX)
 *   4. 无重复 ID
 *   5. chapter/order 无冲突
 *   6. 坐标范围 0~1
 */

import { readdirSync, readFileSync } from 'fs'
import { join, resolve } from 'path'
import { LevelValidator } from '../packages/shared/src/validation/LevelValidator'
import type { LevelConfig, GameObjectConfig } from '../packages/shared/src/types/level'

const CONFIGS_DIR = resolve(__dirname, '../packages/levels/src/configs')

let exitCode = 0
const errors: string[] = []
const warnings: string[] = []

function fail(msg: string) {
  errors.push(`❌ ${msg}`)
  exitCode = 1
}

function warn(msg: string) {
  warnings.push(`⚠️  ${msg}`)
}

function log(msg: string) {
  console.log(msg)
}

// Step 1: Discover & parse all JSON files
const files = readdirSync(CONFIGS_DIR).filter((f) => f.endsWith('.json')).sort()
log(`\n🔍 Found ${files.length} level config files\n`)

if (files.length === 0) {
  fail('No level config files found')
  process.exit(1)
}

const configs: LevelConfig[] = []
for (const file of files) {
  try {
    const raw = readFileSync(join(CONFIGS_DIR, file), 'utf-8')
    configs.push(JSON.parse(raw) as LevelConfig)
  } catch (e) {
    fail(`${file}: JSON parse error - ${(e as Error).message}`)
  }
}

// Step 2: ID naming convention
for (const config of configs) {
  if (!/^level-\d{3}$/.test(config.id)) {
    fail(`${config.id}: ID must match pattern "level-XXX" (3 digits, zero-padded)`)
  }
}

// Step 3: Unique IDs
const idSet = new Set<string>()
for (const config of configs) {
  if (idSet.has(config.id)) {
    fail(`${config.id}: duplicate level ID`)
  }
  idSet.add(config.id)
}

// Step 4: Unique chapter:order
const chapterOrderSet = new Set<string>()
for (const config of configs) {
  const key = `${config.chapter}:${config.order}`
  if (chapterOrderSet.has(key)) {
    fail(`${config.id}: duplicate chapter:order (${key})`)
  }
  chapterOrderSet.add(key)
}

// Step 5: Position range check
function checkPositions(config: LevelConfig) {
  const walk = (objects: GameObjectConfig[], path: string) => {
    for (const obj of objects) {
      const { x, y } = obj.position
      if (x < 0 || x > 1 || y < 0 || y > 1) {
        fail(`${config.id}.${obj.id}: position (${x}, ${y}) out of [0, 1] range`)
      }
      if (obj.children) walk(obj.children, `${path}.${obj.id}`)
    }
  }
  walk(config.objects, 'objects')
}

for (const config of configs) {
  checkPositions(config)
}

// Step 6: LevelValidator checks
const validator = new LevelValidator()
const results = validator.validateAll(configs)
for (const [id, errs] of results) {
  for (const e of errs) {
    if (e.severity === 'error') {
      fail(`${id}: [${e.path}] ${e.message}`)
    } else {
      warn(`${id}: [${e.path}] ${e.message}`)
    }
  }
}

// Output
console.log('─'.repeat(60))
if (warnings.length > 0) {
  console.log(`\n${warnings.length} warning(s):`)
  for (const w of warnings) console.log(`  ${w}`)
}
if (errors.length > 0) {
  console.log(`\n${errors.length} error(s):`)
  for (const e of errors) console.log(`  ${e}`)
  console.log(`\n💥 Check failed with ${errors.length} error(s)`)
} else {
  console.log(`\n✅ All ${configs.length} level configs passed checks (${warnings.length} warning(s))`)
}
console.log('')

process.exit(exitCode)
