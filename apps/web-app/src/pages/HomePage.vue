<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { getAllLevels, getLevelsByChapter, getChapterCount } from '@nicetap/levels'

const router = useRouter()

const chapters = computed(() => {
  const count = getChapterCount()
  const result: { chapter: number; levels: ReturnType<typeof getAllLevels> }[] = []
  for (let i = 1; i <= count; i++) {
    result.push({ chapter: i, levels: getLevelsByChapter(i) })
  }
  return result
})

function playLevel(levelId: string) {
  router.push(`/game/${levelId}`)
}

function playFromStart() {
  router.push('/game')
}
</script>

<template>
  <div class="home-page">
    <header class="header">
      <h1 class="title">NiceTap</h1>
      <p class="subtitle">无厘头反套路关卡小游戏</p>
      <button class="start-btn" @click="playFromStart">从头开始</button>
    </header>

    <div class="level-grid">
      <section v-for="ch in chapters" :key="ch.chapter" class="chapter-section">
        <h2 class="chapter-title">第 {{ ch.chapter }} 章</h2>
        <div class="levels">
          <button
            v-for="level in ch.levels"
            :key="level.id"
            class="level-card"
            @click="playLevel(level.id)"
          >
            <span class="level-order">{{ level.order }}</span>
            <span class="level-title">{{ level.title }}</span>
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
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 2rem 1rem 1.5rem;
  gap: 0.5rem;
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

.start-btn {
  margin-top: 1rem;
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

.start-btn:active {
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
  padding: 0.75rem 1rem;
  border: none;
  border-radius: 10px;
  background: white;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  cursor: pointer;
  transition: transform 0.1s, box-shadow 0.15s;
  text-align: left;
}

.level-card:active {
  transform: scale(0.96);
  box-shadow: 0 0 0 2px #4f46e5;
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

.level-title {
  font-size: 0.85rem;
  color: #333;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
