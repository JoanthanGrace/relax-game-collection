import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { LevelConfig } from '@nicetap/shared'
import {
  registerLevels,
  LevelRunner,
  type LevelStatus,
  type LevelRunnerCallbacks,
} from '@nicetap/game-core'
import { getAllLevels } from '@nicetap/levels'

export const useGameStore = defineStore('game', () => {
  const status = ref<LevelStatus>('idle')
  const currentLevel = ref<LevelConfig | null>(null)
  const currentIndex = ref(0)
  const totalLevels = ref(0)
  const initialized = ref(false)
  const hintText = ref('')
  const hintVisible = ref(false)

  let runner: LevelRunner | null = null

  const hasNext = computed(() => {
    return runner?.hasNextLevel() ?? false
  })

  const progress = computed(() => {
    if (totalLevels.value === 0) return '0/0'
    return `${currentIndex.value + 1}/${totalLevels.value}`
  })

  function init() {
    if (initialized.value) return

    const levels = getAllLevels()
    registerLevels(levels)

    const callbacks: LevelRunnerCallbacks = {
      onStatusChange(s: LevelStatus) {
        status.value = s
      },
      onLevelLoaded(config: LevelConfig) {
        currentLevel.value = config
      },
    }

    runner = new LevelRunner(callbacks)
    totalLevels.value = runner.getTotalLevels()
    initialized.value = true
  }

  async function startFirstLevel() {
    init()
    await runner!.loadFirstLevel()
    currentIndex.value = runner!.getCurrentIndex()
  }

  async function startLevel(levelId: string) {
    init()
    await runner!.loadLevel(levelId)
    currentIndex.value = runner!.getCurrentIndex()
  }

  async function startLevelByIndex(index: number) {
    init()
    await runner!.loadLevelByIndex(index)
    currentIndex.value = runner!.getCurrentIndex()
  }

  async function nextLevel() {
    if (!runner) return
    const config = await runner.loadNextLevel()
    if (config) {
      currentIndex.value = runner.getCurrentIndex()
    }
    return config
  }

  async function retryLevel() {
    if (!runner) return
    await runner.retryLevel()
    currentIndex.value = runner.getCurrentIndex()
  }

  function markWin() {
    hintVisible.value = false
    runner?.markWin()
  }

  function markFail() {
    runner?.markFail()
  }

  function showHint(text: string) {
    if (text) {
      hintText.value = text
      hintVisible.value = true
    }
  }

  function dismissHint() {
    hintVisible.value = false
  }

  return {
    status,
    currentLevel,
    currentIndex,
    totalLevels,
    hasNext,
    progress,
    hintText,
    hintVisible,
    init,
    startFirstLevel,
    startLevel,
    startLevelByIndex,
    nextLevel,
    retryLevel,
    markWin,
    markFail,
    showHint,
    dismissHint,
  }
})
