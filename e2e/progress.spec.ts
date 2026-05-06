import { expect, test, type Page } from '@playwright/test'

const PROGRESS_KEY = 'nicetap:progress:v1'
const SETTINGS_KEY = 'nicetap:settings:v1'

async function seedProgress(page: Page, ids: string[]) {
  await page.goto('/')
  await page.evaluate(
    ({ key, completedLevelIds }) => {
      window.localStorage.setItem(key, JSON.stringify({ completedLevelIds }))
    },
    { key: PROGRESS_KEY, completedLevelIds: ids },
  )
}

test.describe('Progress and settings flows', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.evaluate(
      ({ progressKey, settingsKey }) => {
        window.localStorage.removeItem(progressKey)
        window.localStorage.removeItem(settingsKey)
      },
      { progressKey: PROGRESS_KEY, settingsKey: SETTINGS_KEY },
    )
  })

  test('shows the initial locked progression state', async ({ page }) => {
    await page.goto('/')

    await expect(page.getByText('已通关 0 / 30')).toBeVisible()

    const firstLevel = page.getByRole('button', { name: /点一下就行/ })
    await expect(firstLevel).toBeEnabled()
    await expect(firstLevel).toContainText('当前关')

    const secondLevel = page.getByRole('button', { name: /找到按钮/ })
    await expect(secondLevel).toBeDisabled()
    await expect(secondLevel).toContainText('未解锁')
  })

  test('opens settings and persists the sound toggle', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: '打开设置' }).click()

    await expect(page).toHaveURL(/\/settings$/)
    await expect(page.getByRole('heading', { name: '设置' })).toBeVisible()

    const soundToggle = page.getByRole('button', { name: '切换音效' })
    await expect(soundToggle).toHaveAttribute('aria-pressed', 'true')
    await soundToggle.click()
    await expect(soundToggle).toHaveAttribute('aria-pressed', 'false')

    await page.reload()
    await expect(page.getByRole('button', { name: '切换音效' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )

    await page.getByRole('button', { name: '←' }).click()
    await expect(page).toHaveURL('/')
  })

  test('continues from the first incomplete level and keeps progress after refresh', async ({ page }) => {
    await seedProgress(page, ['level-001'])
    await page.goto('/')

    await expect(page.getByText('已通关 1 / 30')).toBeVisible()
    await expect(page.getByRole('button', { name: /点一下就行/ })).toContainText('已通关')

    const secondLevel = page.getByRole('button', { name: /找到按钮/ })
    await expect(secondLevel).toBeEnabled()
    await expect(secondLevel).toContainText('当前关')

    await page.getByRole('button', { name: '继续游戏' }).click()
    await expect(page).toHaveURL(/\/game\/level-002$/)

    await page.goto('/')
    await page.reload()
    await expect(page.getByText('已通关 1 / 30')).toBeVisible()
    await expect(page.getByRole('button', { name: /找到按钮/ })).toContainText('当前关')
  })

  test('clears progress from settings', async ({ page }) => {
    await seedProgress(page, ['level-001', 'level-002'])
    await page.goto('/settings')

    await expect(page.getByText('已通关 2 / 30 关。')).toBeVisible()

    page.once('dialog', async (dialog) => {
      await dialog.accept()
    })
    await page.getByRole('button', { name: '清除' }).click()

    await expect(page.getByText('已通关 0 / 30 关。')).toBeVisible()

    await page.getByRole('button', { name: '←' }).click()
    await expect(page.getByText('已通关 0 / 30')).toBeVisible()
    await expect(page.getByRole('button', { name: /点一下就行/ })).toContainText('当前关')
  })
})
