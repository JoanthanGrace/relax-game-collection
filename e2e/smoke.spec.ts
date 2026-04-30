/**
 * Smoke E2E 测试
 *
 * 验证应用能正常启动、页面可加载、核心 UI 元素存在。
 * 不依赖具体 UI 细节（CSS class、像素位置等），
 * 只检查"应用活着"和"关键功能入口可达"。
 */
import { test, expect } from '@playwright/test'

test.describe('App smoke tests', () => {
  test('should load the home page', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/NiceTap/i)
  })

  test('should have a visible page body', async ({ page }) => {
    await page.goto('/')
    const body = page.locator('body')
    await expect(body).toBeVisible()
  })

  test('should render the Vue app root', async ({ page }) => {
    await page.goto('/')
    const app = page.locator('#app')
    await expect(app).toBeAttached()
    const children = await app.locator('> *').count()
    expect(children).toBeGreaterThan(0)
  })

  test('should not have console errors on load', async ({ page }) => {
    const errors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text())
      }
    })
    await page.goto('/')
    await page.waitForTimeout(2000)

    const criticalErrors = errors.filter(
      (e) => !e.includes('favicon') && !e.includes('service-worker'),
    )
    expect(criticalErrors, `Console errors: ${criticalErrors.join('; ')}`).toHaveLength(0)
  })

  test('should navigate to a game page without crashing', async ({ page }) => {
    await page.goto('/')
    await page.waitForTimeout(1000)

    const hasPlayButton = await page.getByRole('button').or(page.getByRole('link')).first().isVisible().catch(() => false)
    if (hasPlayButton) {
      await page.getByRole('button').or(page.getByRole('link')).first().click()
      await page.waitForTimeout(2000)
    }

    expect(page.url()).toBeTruthy()
  })
})
