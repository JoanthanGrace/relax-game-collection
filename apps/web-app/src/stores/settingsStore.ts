import { defineStore } from 'pinia'
import { ref } from 'vue'

const STORAGE_KEY = 'nicetap:settings:v1'

interface StoredSettings {
  soundEnabled: boolean
}

export const useSettingsStore = defineStore('settings', () => {
  const soundEnabled = ref(true)
  const initialized = ref(false)

  function load() {
    if (initialized.value) return
    initialized.value = true

    if (typeof window === 'undefined') return

    try {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      if (!raw) return

      const parsed = JSON.parse(raw) as Partial<StoredSettings>
      if (typeof parsed.soundEnabled === 'boolean') {
        soundEnabled.value = parsed.soundEnabled
      }
    } catch {
      soundEnabled.value = true
    }
  }

  function save() {
    if (typeof window === 'undefined') return

    const data: StoredSettings = {
      soundEnabled: soundEnabled.value,
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  }

  function setSoundEnabled(value: boolean) {
    load()
    soundEnabled.value = value
    save()
  }

  function toggleSound() {
    setSoundEnabled(!soundEnabled.value)
  }

  return {
    soundEnabled,
    load,
    setSoundEnabled,
    toggleSound,
  }
})
