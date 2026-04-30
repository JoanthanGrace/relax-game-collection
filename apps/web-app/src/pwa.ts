import { registerSW } from 'virtual:pwa-register'

let updateSW: ((reloadPage?: boolean) => Promise<void>) | undefined

export function initPWA() {
  updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      if (confirm('新版本已就绪，是否立即更新？')) {
        updateSW?.(true)
      }
    },
    onOfflineReady() {
      console.log('[PWA] 离线缓存就绪')
    },
    onRegisteredSW(swUrl, registration) {
      if (!registration) return
      setInterval(
        () => {
          registration.update()
        },
        60 * 60 * 1000,
      )
    },
  })
}
