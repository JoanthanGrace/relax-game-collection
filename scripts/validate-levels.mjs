/**
 * Level validation script - runs the validator logic in pure JS
 * No external dependencies needed
 */
import { readFileSync, readdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const CONFIGS_DIR = join(__dirname, '../packages/levels/src/configs')

const KNOWN_INTERACTION_TYPES = new Set([
  'click', 'multi-click', 'long-press', 'drag', 'swipe', 'wait', 'pinch', 'toggle',
])

const KNOWN_CONDITION_TYPES = new Set([
  'event-fired', 'event-count', 'no-action', 'timer-expired', 'object-state', 'sequence', 'composite',
])

const KNOWN_REACTION_ACTION_TYPES = new Set([
  'show', 'hide', 'set-text', 'move', 'set-interactive', 'emit-event', 'destroy', 'shake', 'flash', 'set-style',
])

function validate(config) {
  const errors = []

  // checkRequired
  if (!config.id) errors.push({ path: 'id', message: '缺少 id', severity: 'error' })
  if (!config.title) errors.push({ path: 'title', message: '缺少 title', severity: 'error' })
  if (!config.instruction) errors.push({ path: 'instruction', message: '缺少 instruction', severity: 'error' })
  if (!config.objects || config.objects.length === 0) errors.push({ path: 'objects', message: '至少需要一个 object', severity: 'error' })
  if (!config.winConditions || config.winConditions.length === 0) errors.push({ path: 'winConditions', message: '至少需要一个通关条件', severity: 'error' })
  if (!config.passFeedback?.texts?.length) errors.push({ path: 'passFeedback.texts', message: '缺少通关反馈文案', severity: 'error' })
  if (!config.failFeedback?.texts?.length) errors.push({ path: 'failFeedback.texts', message: '缺少失败反馈文案', severity: 'warning' })

  // checkObjectIds
  const objectIds = new Set()
  const walkObjects = (objects, prefix) => {
    for (const obj of objects) {
      if (objectIds.has(obj.id)) errors.push({ path: `${prefix}.${obj.id}`, message: `对象 ID "${obj.id}" 重复`, severity: 'error' })
      objectIds.add(obj.id)
      if (obj.children) walkObjects(obj.children, `${prefix}.${obj.id}.children`)
    }
  }
  if (config.objects) walkObjects(config.objects, 'objects')

  // checkInteractions
  const walkInteractions = (objects) => {
    for (const obj of objects) {
      if (obj.interactions) {
        for (const interaction of obj.interactions) {
          if (!KNOWN_INTERACTION_TYPES.has(interaction.type)) {
            errors.push({ path: `objects.${obj.id}.interactions`, message: `未知交互类型 "${interaction.type}"`, severity: 'error' })
          }
          if (!interaction.emits) {
            errors.push({ path: `objects.${obj.id}.interactions`, message: '交互缺少 emits 字段', severity: 'error' })
          }
          if (interaction.type === 'multi-click' && (!interaction.clickCount || interaction.clickCount < 2)) {
            errors.push({ path: `objects.${obj.id}.interactions[multi-click]`, message: 'multi-click 的 clickCount 应 >= 2', severity: 'error' })
          }
          if (interaction.type === 'long-press' && interaction.duration !== undefined && interaction.duration < 100) {
            errors.push({ path: `objects.${obj.id}.interactions[long-press]`, message: 'long-press 的 duration 太短 (< 100ms)', severity: 'warning' })
          }
          if (interaction.type === 'drag' && !interaction.dragTarget) {
            errors.push({ path: `objects.${obj.id}.interactions[drag]`, message: 'drag 交互缺少 dragTarget', severity: 'warning' })
          }
          if (interaction.type === 'pinch' && !interaction.targetScale) {
            errors.push({ path: `objects.${obj.id}.interactions[pinch]`, message: 'pinch 交互缺少 targetScale', severity: 'error' })
          }
          if (interaction.type === 'wait' && !interaction.waitDuration) {
            errors.push({ path: `objects.${obj.id}.interactions[wait]`, message: 'wait 交互缺少 waitDuration', severity: 'error' })
          }
        }
      }
      if (obj.children) walkInteractions(obj.children)
    }
  }
  if (config.objects) walkInteractions(config.objects)

  // checkConditions
  const checkConditions = (conditions, prefix) => {
    for (let i = 0; i < conditions.length; i++) {
      const c = conditions[i]
      if (!KNOWN_CONDITION_TYPES.has(c.type)) {
        errors.push({ path: `${prefix}[${i}]`, message: `未知条件类型 "${c.type}"`, severity: 'error' })
      }
      if (c.type === 'composite' && (!c.children || c.children.length === 0)) {
        errors.push({ path: `${prefix}[${i}]`, message: 'composite 条件缺少 children', severity: 'error' })
      }
      if (c.children) checkConditions(c.children, `${prefix}[${i}].children`)
    }
  }
  if (config.winConditions) checkConditions(config.winConditions, 'winConditions')
  if (config.failConditions) checkConditions(config.failConditions, 'failConditions')

  // checkEventReachability
  if (!config.scriptId) {
    const emittableEvents = new Set()
    const collectEmits = (objects) => {
      for (const obj of objects) {
        if (obj.interactions) {
          for (const interaction of obj.interactions) {
            emittableEvents.add(interaction.emits)
          }
        }
        if (obj.children) collectEmits(obj.children)
      }
    }
    if (config.objects) collectEmits(config.objects)

    // Also add events emitted by reactions (emit-event actions)
    if (config.reactions) {
      for (const reaction of config.reactions) {
        for (const action of reaction.actions) {
          if (action.type === 'emit-event' && action.eventId) {
            emittableEvents.add(action.eventId)
          }
        }
      }
    }

    const checkConditionEvents = (conditions, prefix) => {
      for (let i = 0; i < conditions.length; i++) {
        const c = conditions[i]
        if ((c.type === 'event-fired' || c.type === 'event-count') && c.eventId) {
          if (!emittableEvents.has(c.eventId)) {
            errors.push({ path: `${prefix}[${i}]`, message: `事件 "${c.eventId}" 没有任何交互能触发它`, severity: 'error' })
          }
        }
        if (c.type === 'sequence' && c.eventSequence) {
          for (const eventId of c.eventSequence) {
            if (!emittableEvents.has(eventId)) {
              errors.push({ path: `${prefix}[${i}].eventSequence`, message: `序列中的事件 "${eventId}" 没有任何交互能触发它`, severity: 'error' })
            }
          }
        }
        if (c.children) checkConditionEvents(c.children, `${prefix}[${i}].children`)
      }
    }
    if (config.winConditions) checkConditionEvents(config.winConditions, 'winConditions')
    if (config.failConditions) checkConditionEvents(config.failConditions, 'failConditions')
  }

  // checkHints
  if (config.hints) {
    for (let i = 0; i < config.hints.length; i++) {
      const hint = config.hints[i]
      if (hint.highlightObjectId && !objectIds.has(hint.highlightObjectId)) {
        errors.push({ path: `hints[${i}].highlightObjectId`, message: `引用了不存在的对象 "${hint.highlightObjectId}"`, severity: 'error' })
      }
    }
  }

  // checkReactions
  if (config.reactions) {
    for (let i = 0; i < config.reactions.length; i++) {
      const reaction = config.reactions[i]
      const prefix = `reactions[${i}]`
      if (!reaction.trigger) errors.push({ path: `${prefix}.trigger`, message: '缺少 trigger 事件 ID', severity: 'error' })
      if (!reaction.actions || reaction.actions.length === 0) {
        errors.push({ path: `${prefix}.actions`, message: '至少需要一个 action', severity: 'error' })
        continue
      }
      for (let j = 0; j < reaction.actions.length; j++) {
        const action = reaction.actions[j]
        const actionPath = `${prefix}.actions[${j}]`
        if (!KNOWN_REACTION_ACTION_TYPES.has(action.type)) {
          errors.push({ path: `${actionPath}.type`, message: `未知 action 类型 "${action.type}"`, severity: 'error' })
        }
        if (action.objectId && !objectIds.has(action.objectId)) {
          errors.push({ path: `${actionPath}.objectId`, message: `引用了不存在的对象 "${action.objectId}"`, severity: 'warning' })
        }
        if (action.type === 'emit-event' && !action.eventId && !action.value) {
          errors.push({ path: actionPath, message: 'emit-event action 需要 eventId 或 value', severity: 'error' })
        }
      }
    }
  }

  return errors
}

// Load all level configs
const files = readdirSync(CONFIGS_DIR).filter(f => f.endsWith('.json')).sort()
const configs = files.map(f => JSON.parse(readFileSync(join(CONFIGS_DIR, f), 'utf-8')))

console.log(`找到 ${configs.length} 个关卡配置\n`)

let hasErrors = false
let totalErrors = 0
let totalWarnings = 0

// Check duplicate IDs
const ids = new Set()
for (const config of configs) {
  if (ids.has(config.id)) {
    console.error(`❌ 关卡 ID "${config.id}" 重复`)
    hasErrors = true
    totalErrors++
  }
  ids.add(config.id)
}

// Validate each level
for (const config of configs) {
  const errors = validate(config)
  const realErrors = errors.filter(e => e.severity === 'error')
  const warnings = errors.filter(e => e.severity === 'warning')
  totalErrors += realErrors.length
  totalWarnings += warnings.length

  if (realErrors.length > 0) {
    hasErrors = true
    console.error(`❌ ${config.id} (${config.title}):`)
    for (const err of realErrors) {
      console.error(`   [ERROR] ${err.path}: ${err.message}`)
    }
  }
  if (warnings.length > 0) {
    console.warn(`⚠️  ${config.id} (${config.title}):`)
    for (const warn of warnings) {
      console.warn(`   [WARN]  ${warn.path}: ${warn.message}`)
    }
  }
}

console.log(`\n${'='.repeat(50)}`)
console.log(`总计: ${configs.length} 关`)
console.log(`错误: ${totalErrors}`)
console.log(`警告: ${totalWarnings}`)

if (!hasErrors) {
  console.log('\n✅ 所有关卡通过校验！')
} else {
  console.log('\n❌ 存在校验错误，需要修复')
  process.exit(1)
}
