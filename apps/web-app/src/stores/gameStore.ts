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
const SKIP_KEY = 'nicetap:daily-skips:v1'
const FREE_SKIPS = 3
const today = () => new Date().toLocaleDateString('en-CA')

interface StoredProgress {
  completedLevelIds: string[]
  skippedLevelIds?: string[]
}

export const useGameStore = defineStore('game', () => {
  const status = ref<LevelStatus>('idle')
  const currentLevel = ref<LevelConfig | null>(null)
  const currentIndex = ref(0)
  const totalLevels = ref(0)
  const initialized = ref(false)
  const levelRevision = ref(0)
  const hintText = ref('')
  const hintVisible = ref(false)
  const levelIds = ref<string[]>([])
  const completedLevelIds = ref<string[]>([])
  const skippedLevelIds = ref<string[]>([])
  const remainingSkips = ref(FREE_SKIPS)

  let runner: LevelRunner | null = null

  const manualLevelSet = computed(() => new Set(completedLevelIds.value))
  const completedLevelSet = computed(() => new Set([...completedLevelIds.value, ...skippedLevelIds.value]))

  const hasNext = computed(() => currentIndex.value + 1 < totalLevels.value)

  const completedCount = computed(() => completedLevelSet.value.size)
  const manualCount = computed(() => completedLevelIds.value.length)
  const skippedCount = computed(() => skippedLevelIds.value.length)

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
      completedLevelIds.value = [...new Set(parsed.completedLevelIds.filter((id) => knownIds.has(id)))]
      skippedLevelIds.value = Array.isArray(parsed.skippedLevelIds)
        ? [...new Set(parsed.skippedLevelIds.filter((id) => knownIds.has(id) && !manualLevelSet.value.has(id)))] : []
    } catch {
      completedLevelIds.value = []
      skippedLevelIds.value = []
    }
  }

  function saveProgress() {
    if (typeof window === 'undefined') return

    const data: StoredProgress = {
      completedLevelIds: completedLevelIds.value,
      skippedLevelIds: skippedLevelIds.value,
    }
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    } catch { /* Keep the current session playable when storage is unavailable. */ }
  }

  function clearProgress() {
    completedLevelIds.value = []
    skippedLevelIds.value = []
    if (typeof window !== 'undefined') {
      try { window.localStorage.removeItem(STORAGE_KEY) } catch { /* Session-only progress. */ }
    }
  }

  function refreshSkipQuota() {
    try {
      const quota = JSON.parse(window.localStorage.getItem(SKIP_KEY) ?? 'null')
      const used = quota?.day === today() && Number.isInteger(quota.used) && quota.used >= 0 ? quota.used : 0
      remainingSkips.value = Math.max(0, FREE_SKIPS - used)
    } catch { remainingSkips.value = 0 }
  }

  function skipLevel(): boolean {
    refreshSkipQuota()
    const id = currentLevel.value?.id
    if (!id || !['playing', 'fail'].includes(status.value) || completedLevelSet.value.has(id) || !remainingSkips.value) return false
    try {
      window.localStorage.setItem(SKIP_KEY, JSON.stringify({ day: today(), used: FREE_SKIPS - remainingSkips.value + 1 }))
    } catch { return false }
    remainingSkips.value--
    skippedLevelIds.value = [...skippedLevelIds.value, id]
    saveProgress()
    hintVisible.value = false
    runner?.markWin()
    return true
  }

  function init() {
    if (initialized.value) return

    const levels = getAllLevels()
    registerLevels(levels)
    levelIds.value = levels.map((level) => level.id)
    loadProgress()
    refreshSkipQuota()

    const callbacks: LevelRunnerCallbacks = {
      onStatusChange(s: LevelStatus) {
        status.value = s
      },
      onLevelLoaded(config: LevelConfig) {
        currentLevel.value = config
        levelRevision.value++
        hintVisible.value = false
        refreshSkipQuota()
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
    if (currentLevel.value && !manualLevelSet.value.has(currentLevel.value.id)) {
      skippedLevelIds.value = skippedLevelIds.value.filter((id) => id !== currentLevel.value!.id)
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

  function isLevelSkipped(levelId: string) {
    return skippedLevelIds.value.includes(levelId)
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
    levelRevision,
    currentIndex,
    totalLevels,
    hasNext,
    completedCount,
    manualCount,
    skippedCount,
    remainingSkips,
    refreshSkipQuota,
    skipLevel,
    isLevelSkipped,
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
    clearProgress,
    isLevelCompleted,
    isLevelCurrent,
    isLevelLocked,
  }
})
