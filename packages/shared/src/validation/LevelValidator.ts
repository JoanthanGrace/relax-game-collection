/**
 * 关卡配置校验器 - 纯函数，零平台依赖
 * 可在 CI、runtime、编辑器中运行
 */

import type {
  LevelConfig,
  GameObjectConfig,
  Condition,
  InteractionConfig,
} from '../types/level'

export interface ValidationError {
  path: string
  message: string
  severity: 'error' | 'warning'
}

const KNOWN_INTERACTION_TYPES = new Set([
  'click',
  'multi-click',
  'long-press',
  'drag',
  'swipe',
  'wait',
  'pinch',
  'toggle',
])

const KNOWN_REACTION_ACTION_TYPES = new Set([
  'show',
  'hide',
  'set-text',
  'move',
  'set-interactive',
  'emit-event',
  'destroy',
  'shake',
  'flash',
  'set-style',
])

const KNOWN_CONDITION_TYPES = new Set([
  'event-fired',
  'event-count',
  'no-action',
  'timer-expired',
  'object-state',
  'sequence',
  'composite',
])

export class LevelValidator {
  validate(config: LevelConfig): ValidationError[] {
    const errors: ValidationError[] = []

    this.checkRequired(config, errors)
    this.checkObjectIds(config, errors)
    this.checkInteractions(config, errors)
    this.checkConditions(config, errors)
    this.checkEventReachability(config, errors)
    this.checkHints(config, errors)
    this.checkReactions(config, errors)

    return errors
  }

  validateAll(configs: LevelConfig[]): Map<string, ValidationError[]> {
    const results = new Map<string, ValidationError[]>()
    const ids = new Set<string>()

    for (const config of configs) {
      const errors = this.validate(config)
      if (ids.has(config.id)) {
        errors.push({
          path: 'id',
          message: `关卡 ID "${config.id}" 重复`,
          severity: 'error',
        })
      }
      ids.add(config.id)
      results.set(config.id, errors)
    }

    return results
  }

  private checkRequired(config: LevelConfig, errors: ValidationError[]): void {
    if (!config.id) {
      errors.push({ path: 'id', message: '缺少 id', severity: 'error' })
    }
    if (!config.title) {
      errors.push({ path: 'title', message: '缺少 title', severity: 'error' })
    }
    if (!config.instruction) {
      errors.push({ path: 'instruction', message: '缺少 instruction', severity: 'error' })
    }
    if (!config.objects || config.objects.length === 0) {
      errors.push({ path: 'objects', message: '至少需要一个 object', severity: 'error' })
    }
    if (!config.winConditions || config.winConditions.length === 0) {
      errors.push({
        path: 'winConditions',
        message: '至少需要一个通关条件',
        severity: 'error',
      })
    }
    if (!config.passFeedback?.texts?.length) {
      errors.push({
        path: 'passFeedback.texts',
        message: '缺少通关反馈文案',
        severity: 'error',
      })
    }
    if (!config.failFeedback?.texts?.length) {
      errors.push({
        path: 'failFeedback.texts',
        message: '缺少失败反馈文案',
        severity: 'warning',
      })
    }
  }

  private checkObjectIds(config: LevelConfig, errors: ValidationError[]): void {
    const ids = new Set<string>()
    const walk = (objects: GameObjectConfig[], prefix: string) => {
      for (const obj of objects) {
        if (ids.has(obj.id)) {
          errors.push({
            path: `${prefix}.${obj.id}`,
            message: `对象 ID "${obj.id}" 重复`,
            severity: 'error',
          })
        }
        ids.add(obj.id)
        if (obj.children) {
          walk(obj.children, `${prefix}.${obj.id}.children`)
        }
      }
    }
    walk(config.objects, 'objects')
  }

  private checkInteractions(config: LevelConfig, errors: ValidationError[]): void {
    const walk = (objects: GameObjectConfig[]) => {
      for (const obj of objects) {
        if (obj.interactions) {
          for (const interaction of obj.interactions) {
            if (!KNOWN_INTERACTION_TYPES.has(interaction.type)) {
              errors.push({
                path: `objects.${obj.id}.interactions`,
                message: `未知交互类型 "${interaction.type}"`,
                severity: 'error',
              })
            }
            if (!interaction.emits) {
              errors.push({
                path: `objects.${obj.id}.interactions`,
                message: '交互缺少 emits 字段',
                severity: 'error',
              })
            }
            this.checkInteractionParams(obj.id, interaction, errors)
          }
        }
        if (obj.children) walk(obj.children)
      }
    }
    walk(config.objects)
  }

  private checkInteractionParams(
    objectId: string,
    interaction: InteractionConfig,
    errors: ValidationError[],
  ): void {
    const path = `objects.${objectId}.interactions[${interaction.type}]`

    if (interaction.type === 'multi-click' && (!interaction.clickCount || interaction.clickCount < 2)) {
      errors.push({ path, message: 'multi-click 的 clickCount 应 >= 2', severity: 'error' })
    }
    if (
      interaction.type === 'long-press' &&
      interaction.duration !== undefined &&
      interaction.duration < 100
    ) {
      errors.push({ path, message: 'long-press 的 duration 太短 (< 100ms)', severity: 'warning' })
    }
    if (interaction.type === 'drag' && !interaction.dragTarget) {
      errors.push({ path, message: 'drag 交互缺少 dragTarget', severity: 'warning' })
    }
    if (interaction.type === 'pinch' && !interaction.targetScale) {
      errors.push({ path, message: 'pinch 交互缺少 targetScale', severity: 'error' })
    }
    if (interaction.type === 'wait' && !interaction.waitDuration) {
      errors.push({ path, message: 'wait 交互缺少 waitDuration', severity: 'error' })
    }
  }

  private checkConditions(config: LevelConfig, errors: ValidationError[]): void {
    const check = (conditions: Condition[], prefix: string) => {
      for (let i = 0; i < conditions.length; i++) {
        const c = conditions[i]
        if (!KNOWN_CONDITION_TYPES.has(c.type)) {
          errors.push({
            path: `${prefix}[${i}]`,
            message: `未知条件类型 "${c.type}"`,
            severity: 'error',
          })
        }
        if (c.type === 'composite' && (!c.children || c.children.length === 0)) {
          errors.push({
            path: `${prefix}[${i}]`,
            message: 'composite 条件缺少 children',
            severity: 'error',
          })
        }
        if (c.children) {
          check(c.children, `${prefix}[${i}].children`)
        }
      }
    }

    check(config.winConditions, 'winConditions')
    if (config.failConditions) {
      check(config.failConditions, 'failConditions')
    }
  }

  private checkEventReachability(config: LevelConfig, errors: ValidationError[]): void {
    const emittableEvents = new Set<string>()

    const collectEmits = (objects: GameObjectConfig[]) => {
      for (const obj of objects) {
        if (obj.interactions) {
          for (const interaction of obj.interactions) {
            emittableEvents.add(interaction.emits)
          }
        }
        if (obj.children) collectEmits(obj.children)
      }
    }
    collectEmits(config.objects)

    if (config.scriptId) return

    const checkConditionEvents = (conditions: Condition[], prefix: string) => {
      for (let i = 0; i < conditions.length; i++) {
        const c = conditions[i]
        if ((c.type === 'event-fired' || c.type === 'event-count') && c.eventId) {
          if (!emittableEvents.has(c.eventId)) {
            errors.push({
              path: `${prefix}[${i}]`,
              message: `事件 "${c.eventId}" 没有任何交互能触发它`,
              severity: 'error',
            })
          }
        }
        if (c.type === 'sequence' && c.eventSequence) {
          for (const eventId of c.eventSequence) {
            if (!emittableEvents.has(eventId)) {
              errors.push({
                path: `${prefix}[${i}].eventSequence`,
                message: `序列中的事件 "${eventId}" 没有任何交互能触发它`,
                severity: 'error',
              })
            }
          }
        }
        if (c.children) {
          checkConditionEvents(c.children, `${prefix}[${i}].children`)
        }
      }
    }

    checkConditionEvents(config.winConditions, 'winConditions')
    if (config.failConditions) {
      checkConditionEvents(config.failConditions, 'failConditions')
    }
  }

  private checkHints(config: LevelConfig, errors: ValidationError[]): void {
    if (!config.hints) return

    const objectIds = new Set<string>()
    const collectIds = (objects: GameObjectConfig[]) => {
      for (const obj of objects) {
        objectIds.add(obj.id)
        if (obj.children) collectIds(obj.children)
      }
    }
    collectIds(config.objects)

    for (let i = 0; i < config.hints.length; i++) {
      const hint = config.hints[i]
      if (hint.highlightObjectId && !objectIds.has(hint.highlightObjectId)) {
        errors.push({
          path: `hints[${i}].highlightObjectId`,
          message: `引用了不存在的对象 "${hint.highlightObjectId}"`,
          severity: 'error',
        })
      }
    }
  }

  private checkReactions(config: LevelConfig, errors: ValidationError[]): void {
    if (!config.reactions) return

    const objectIds = new Set<string>()
    const collectIds = (objects: GameObjectConfig[]) => {
      for (const obj of objects) {
        objectIds.add(obj.id)
        if (obj.children) collectIds(obj.children)
      }
    }
    collectIds(config.objects)

    for (let i = 0; i < config.reactions.length; i++) {
      const reaction = config.reactions[i]
      const prefix = `reactions[${i}]`

      if (!reaction.trigger) {
        errors.push({ path: `${prefix}.trigger`, message: '缺少 trigger 事件 ID', severity: 'error' })
      }

      if (!reaction.actions || reaction.actions.length === 0) {
        errors.push({ path: `${prefix}.actions`, message: '至少需要一个 action', severity: 'error' })
        continue
      }

      for (let j = 0; j < reaction.actions.length; j++) {
        const action = reaction.actions[j]
        const actionPath = `${prefix}.actions[${j}]`

        if (!KNOWN_REACTION_ACTION_TYPES.has(action.type)) {
          errors.push({
            path: `${actionPath}.type`,
            message: `未知 action 类型 "${action.type}"`,
            severity: 'error',
          })
        }

        if (action.objectId && !objectIds.has(action.objectId)) {
          errors.push({
            path: `${actionPath}.objectId`,
            message: `引用了不存在的对象 "${action.objectId}"`,
            severity: 'warning',
          })
        }

        if (action.type === 'emit-event' && !action.eventId && !action.value) {
          errors.push({
            path: `${actionPath}`,
            message: 'emit-event action 需要 eventId 或 value',
            severity: 'error',
          })
        }
      }
    }
  }
}
