/**
 * 提示系统 - 分层递进提示
 *
 * 越往后越直白，但永远不直接说答案。
 * 零渲染引擎依赖，通过 callbacks 与 UI 层交互。
 */

import type { HintConfig } from '@nicetap/shared'

export interface HintCallbacks {
  showHintText(text: string): void
  highlightObject(objectId: string): void
  dismissHint(): void
}

export class HintSystem {
  private hints: HintConfig[]
  private failCount = 0
  private shownHintIndices = new Set<number>()
  private dismissTimer: ReturnType<typeof setTimeout> | null = null

  constructor(
    hints: HintConfig[],
    private callbacks: HintCallbacks,
  ) {
    this.hints = [...hints].sort((a, b) => a.showAfterFailCount - b.showAfterFailCount)
  }

  onFail(): void {
    this.failCount++
    this.tryShowNextHint()
  }

  getFailCount(): number {
    return this.failCount
  }

  reset(): void {
    this.failCount = 0
    this.shownHintIndices.clear()
    if (this.dismissTimer) {
      clearTimeout(this.dismissTimer)
      this.dismissTimer = null
    }
  }

  private tryShowNextHint(): void {
    for (let i = 0; i < this.hints.length; i++) {
      if (this.shownHintIndices.has(i)) continue
      if (this.failCount >= this.hints[i].showAfterFailCount) {
        this.showHint(i)
        return
      }
    }
  }

  private showHint(index: number): void {
    this.shownHintIndices.add(index)
    const hint = this.hints[index]

    this.callbacks.showHintText(hint.text)

    if (hint.highlightObjectId) {
      this.callbacks.highlightObject(hint.highlightObjectId)
    }

    if (hint.autoDismissMs && hint.autoDismissMs > 0) {
      if (this.dismissTimer) clearTimeout(this.dismissTimer)
      this.dismissTimer = setTimeout(() => {
        this.callbacks.dismissHint()
        this.dismissTimer = null
      }, hint.autoDismissMs)
    }
  }
}
