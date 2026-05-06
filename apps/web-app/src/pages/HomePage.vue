<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getAllLevels, getLevelsByChapter, getChapterCount } from '@nicetap/levels'
import { useGameStore } from '@/stores/gameStore'

const router = useRouter()
const game = useGameStore()

const chapters = computed(() => {
  const count = getChapterCount()
  const result: { chapter: number; levels: ReturnType<typeof getAllLevels> }[] = []
  for (let i = 1; i <= count; i++) {
    result.push({ chapter: i, levels: getLevelsByChapter(i) })
  }
  return result
})

function playLevel(levelId: string) {
  if (game.isLevelLocked(levelId)) return
  router.push(`/game/${levelId}`)
}

function playFromStart() {
  router.push('/game')
}

function openSettings() {
  router.push('/settings')
}

function continueGame() {
  if (game.continueLevelId) {
    router.push(`/game/${game.continueLevelId}`)
  } else {
    playFromStart()
  }
}

function getLevelState(levelId: string): 'completed' | 'current' | 'locked' | 'open' {
  if (game.isLevelCompleted(levelId)) return 'completed'
  if (game.isLevelCurrent(levelId)) return 'current'
  if (game.isLevelLocked(levelId)) return 'locked'
  return 'open'
}

onMounted(() => {
  game.init()
})
</script>

<template>
  <div class="home-page">
    <header class="header">
      <button class="settings-btn" aria-label="打开设置" @click="openSettings">
        设置
      </button>
      <h1 class="title">NiceTap</h1>
      <p class="subtitle">无厘头反套路关卡小游戏</p>
      <div class="progress-summary">
        已通关 {{ game.completedCount }} / {{ game.totalLevels }}
      </div>
      <div class="hero-actions">
        <button class="start-btn" @click="continueGame">
          {{ game.hasProgress ? '继续游戏' : '开始游戏' }}
        </button>
        <button v-if="game.hasProgress" class="restart-btn" @click="playFromStart">
          从头开始
        </button>
      </div>
    </header>

    <div class="level-grid">
      <section v-for="ch in chapters" :key="ch.chapter" class="chapter-section">
        <h2 class="chapter-title">第 {{ ch.chapter }} 章</h2>
        <div class="levels">
          <button
            v-for="level in ch.levels"
            :key="level.id"
            class="level-card"
            :class="`level-card--${getLevelState(level.id)}`"
            :disabled="game.isLevelLocked(level.id)"
            @click="playLevel(level.id)"
          >
            <span class="level-order">{{ level.order }}</span>
            <span class="level-content">
              <span class="level-title">{{ level.title }}</span>
              <span class="level-state">
                <template v-if="game.isLevelCompleted(level.id)">已通关</template>
                <template v-else-if="game.isLevelCurrent(level.id)">当前关</template>
                <template v-else-if="game.isLevelLocked(level.id)">未解锁</template>
                <template v-else>可挑战</template>
              </span>
            </span>
          </button>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.home-page {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  background: #fafafa;
}

.header {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 2rem 1rem 1.5rem;
  gap: 0.5rem;
}

.settings-btn {
  position: absolute;
  top: 1rem;
  right: 1rem;
  height: 34px;
  padding: 0 0.85rem;
  border: 1px solid #e0e0ea;
  border-radius: 8px;
  background: white;
  color: #555;
  font-size: 0.85rem;
  font-weight: 700;
  cursor: pointer;
}

.title {
  font-size: 2.2rem;
  font-weight: 800;
  color: #4f46e5;
}

.subtitle {
  font-size: 0.95rem;
  color: #666;
}

.progress-summary {
  margin-top: 0.5rem;
  font-size: 0.9rem;
  color: #555;
}

.hero-actions {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  margin-top: 1rem;
  flex-wrap: wrap;
}

.start-btn {
  padding: 0.75rem 2.5rem;
  font-size: 1rem;
  font-weight: 600;
  border: none;
  border-radius: 10px;
  background: #4f46e5;
  color: white;
  cursor: pointer;
  transition: transform 0.1s;
}

.restart-btn {
  padding: 0.72rem 1.4rem;
  font-size: 0.95rem;
  font-weight: 600;
  border: 1px solid #d7d7e5;
  border-radius: 10px;
  background: white;
  color: #444;
  cursor: pointer;
  transition: transform 0.1s, border-color 0.15s;
}

.start-btn:active,
.restart-btn:active {
  transform: scale(0.95);
}

.level-grid {
  flex: 1;
  padding: 0 1rem 2rem;
}

.chapter-section {
  margin-bottom: 1.5rem;
}

.chapter-title {
  font-size: 1.1rem;
  font-weight: 700;
  color: #333;
  margin-bottom: 0.75rem;
  padding-left: 0.25rem;
}

.levels {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 0.6rem;
}

.level-card {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 0.85rem;
  border: none;
  border-radius: 10px;
  background: white;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  cursor: pointer;
  transition: transform 0.1s, box-shadow 0.15s;
  text-align: left;
}

.level-card:not(:disabled):active {
  transform: scale(0.96);
  box-shadow: 0 0 0 2px #4f46e5;
}

.level-card:disabled {
  cursor: not-allowed;
}

.level-order {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: #eef2ff;
  color: #4f46e5;
  font-weight: 700;
  font-size: 0.85rem;
  flex-shrink: 0;
}

.level-content {
  display: flex;
  flex-direction: column;
  min-width: 0;
  gap: 0.1rem;
}

.level-title {
  font-size: 0.85rem;
  color: #333;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.level-state {
  font-size: 0.72rem;
  color: #888;
}

.level-card--completed .level-order {
  background: #ecfdf3;
  color: #159947;
}

.level-card--completed .level-state {
  color: #159947;
}

.level-card--current {
  box-shadow: 0 0 0 2px #4f46e5, 0 6px 18px rgba(79, 70, 229, 0.16);
}

.level-card--current .level-state {
  color: #4f46e5;
  font-weight: 700;
}

.level-card--locked {
  opacity: 0.48;
}

.level-card--locked .level-order {
  background: #f1f1f1;
  color: #999;
}
</style>
