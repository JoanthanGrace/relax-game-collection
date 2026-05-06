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

const STORAGE_KEY = 'nicetap:progress:v1'

interface StoredProgress {
  completedLevelIds: string[]
}

export const useGameStore = defineStore('game', () => {
  const status = ref<LevelStatus>('idle')
  const currentLevel = ref<LevelConfig | null>(null)
  const currentIndex = ref(0)
  const totalLevels = ref(0)
  const initialized = ref(false)
  const hintText = ref('')
  const hintVisible = ref(false)
  const levelIds = ref<string[]>([])
  const completedLevelIds = ref<string[]>([])

  let runner: LevelRunner | null = null

  const completedLevelSet = computed(() => new Set(completedLevelIds.value))

  const hasNext = computed(() => {
    return runner?.hasNextLevel() ?? false
  })

  const completedCount = computed(() => completedLevelIds.value.length)

  const continueLevelIndex = computed(() => {
    if (totalLevels.value === 0) return 0
    const firstIncompleteIndex = levelIds.value.findIndex((id) => !completedLevelSet.value.has(id))
    return firstIncompleteIndex === -1 ? totalLevels.value - 1 : firstIncompleteIndex
  })

  const highestUnlockedIndex = computed(() => {
    if (totalLevels.value === 0) return 0
    return continueLevelIndex.value
  })

  const continueLevelId = computed(() => {
    if (levelIds.value.length === 0) return undefined
    return levelIds.value[continueLevelIndex.value]
  })

  const hasProgress = computed(() => completedCount.value > 0)

  const progress = computed(() => {
    if (totalLevels.value === 0) return '0/0'
    return `${currentIndex.value + 1}/${totalLevels.value}`
  })

  function loadProgress() {
    if (typeof window === 'undefined') return

    try {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      if (!raw) return

      const parsed = JSON.parse(raw) as Partial<StoredProgress>
      if (!Array.isArray(parsed.completedLevelIds)) return

      const knownIds = new Set(levelIds.value)
      completedLevelIds.value = parsed.completedLevelIds.filter((id) => knownIds.has(id))
    } catch {
      completedLevelIds.value = []
    }
  }

  function saveProgress() {
    if (typeof window === 'undefined') return

    const data: StoredProgress = {
      completedLevelIds: completedLevelIds.value,
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  }

  function init() {
    if (initialized.value) return

    const levels = getAllLevels()
    registerLevels(levels)
    levelIds.value = levels.map((level) => level.id)
    loadProgress()

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

  async function startContinueLevel() {
    init()
    const levelId = continueLevelId.value
    if (levelId) {
      await runner!.loadLevel(levelId)
    } else {
      await runner!.loadFirstLevel()
    }
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
    if (currentLevel.value && !completedLevelSet.value.has(currentLevel.value.id)) {
      completedLevelIds.value = [...completedLevelIds.value, currentLevel.value.id]
      saveProgress()
    }
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

  function isLevelCompleted(levelId: string) {
    return completedLevelSet.value.has(levelId)
  }

  function isLevelCurrent(levelId: string) {
    return continueLevelId.value === levelId && !isLevelCompleted(levelId)
  }

  function isLevelLocked(levelId: string) {
    if (isLevelCompleted(levelId)) return false
    const index = levelIds.value.indexOf(levelId)
    if (index < 0) return true
    return index > highestUnlockedIndex.value
  }

  return {
    status,
    currentLevel,
    currentIndex,
    totalLevels,
    hasNext,
    completedCount,
    continueLevelIndex,
    highestUnlockedIndex,
    continueLevelId,
    hasProgress,
    progress,
    hintText,
    hintVisible,
    init,
    startFirstLevel,
    startContinueLevel,
    startLevel,
    startLevelByIndex,
    nextLevel,
    retryLevel,
    markWin,
    markFail,
    showHint,
    dismissHint,
    isLevelCompleted,
    isLevelCurrent,
    isLevelLocked,
  }
})
