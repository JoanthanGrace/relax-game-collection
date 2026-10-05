import { expect, test } from '@playwright/test'

test.use({ viewport: { width: 390, height: 844 } })

test('three daily skips persist and unlock only the next level', async ({ page }) => {
  await page.goto('/')
  page.on('dialog', (dialog) => dialog.accept())
  await page.getByRole('button', { name: '开始游戏', exact: true }).click()
  for (let i = 3; i >= 1; i--) {
    await page.getByRole('button', { name: `跳过 · ${i}/3`, exact: true }).click()
    await expect(page.getByText('本关已跳过，回头再来收拾它')).toBeVisible()
    await page.getByRole('button', { name: '下一关', exact: true }).click()
  }
  await expect(page.getByRole('button', { name: '跳过 · 0/3', exact: true })).toBeDisabled()
  await page.reload()
  await expect(page.getByRole('button', { name: '跳过 · 0/3', exact: true })).toBeDisabled()
  await expect(page).toHaveURL(/\/game\/level-004$/)
  await expect.poll(() => page.evaluate(() => {
    const canvas = document.querySelector('canvas')?.getBoundingClientRect()
    const area = document.querySelector('.game-area')?.getBoundingClientRect()
    return !!canvas && !!area && canvas.bottom <= area.bottom + 1 && canvas.top >= area.top - 1
  })).toBe(true)
  await page.getByRole('button', { name: '←' }).click()
  await expect(page.getByRole('button', { name: /点一下就行/ })).toContainText('已跳过')
  await expect(page.getByRole('button', { name: /找到按钮/ })).toContainText('已跳过')
  await expect(page.locator('.level-card:disabled')).toHaveCount(46)
  await page.getByRole('button', { name: /点一下就行/ }).click()
  const canvas = page.locator('canvas')
  await expect(canvas).toBeVisible()
  await page.waitForTimeout(600)
  const box = (await canvas.boundingBox())!
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
  await expect(page.getByRole('button', { name: '下一关', exact: true })).toBeVisible()
  await page.getByRole('button', { name: '←' }).click()
  await expect(page.getByRole('button', { name: /点一下就行/ })).toContainText('已通关')
  await expect(page.getByRole('button', { name: /点一下就行/ })).not.toContainText('已跳过')
})

test('hints only appear on request and the canvas stays inside its container', async ({ page }) => {
  await page.goto('/game/level-015')
  const canvas = page.locator('canvas')
  await expect(canvas).toBeVisible()
  await expect(page.locator('.hint-toast')).toHaveCount(0)
  await page.getByRole('button', { name: '提示', exact: true }).click()
  await expect(page.locator('.hint-toast')).toContainText('仔细看题目说什么')
  const fits = await page.evaluate(() => {
    const canvas = document.querySelector('canvas')!.getBoundingClientRect()
    const area = document.querySelector('.game-area')!.getBoundingClientRect()
    return canvas.left >= area.left - 1 && canvas.top >= area.top - 1 && canvas.right <= area.right + 1 && canvas.bottom <= area.bottom + 1
  })
  expect(fits).toBe(true)
})

test('daily quota resets on a new date but not on progress deletion', async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => {
    localStorage.setItem('nicetap:daily-skips:v1', JSON.stringify({ day: '2000-01-01', used: 3 }))
    localStorage.setItem('nicetap:progress:v1', JSON.stringify({ completedLevelIds: [], skippedLevelIds: ['level-001'] }))
  })
  await page.goto('/game/level-002')
  await expect(page.getByRole('button', { name: '跳过 · 3/3', exact: true })).toBeEnabled()
  page.on('dialog', (dialog) => dialog.accept())
  await page.getByRole('button', { name: '跳过 · 3/3', exact: true }).click()
  await page.goto('/settings')
  await page.getByRole('button', { name: '清除', exact: true }).click()
  await page.goto('/game/level-001')
  await expect(page.getByRole('button', { name: '跳过 · 2/3', exact: true })).toBeEnabled()
})

test('skipping the last level offers home rather than a nonexistent next level', async ({ page }) => {
  await page.goto('/game/level-050')
  page.on('dialog', (dialog) => dialog.accept())
  await page.getByRole('button', { name: '跳过 · 3/3', exact: true }).click()
  await expect(page.getByRole('button', { name: '返回首页', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: '下一关', exact: true })).toHaveCount(0)
})

test('edge-removal puzzles remain solvable with drag bounds enabled', async ({ page }) => {
  await page.goto('/game/level-008')
  const canvas = page.locator('canvas')
  await expect(canvas).toBeVisible()
  const box = (await canvas.boundingBox())!
  await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.35)
  await page.mouse.down()
  await page.mouse.move(box.x + 1, box.y + box.height * 0.35, { steps: 20 })
  await page.mouse.up()
  await expect(page.getByRole('button', { name: '下一关', exact: true })).toBeVisible()
})

test('retry reloads a failed scene without showing unsolicited hints', async ({ page }) => {
  await page.goto('/game/level-002')
  const canvas = page.locator('canvas')
  await expect(canvas).toBeVisible()
  await page.waitForTimeout(600)
  const box = (await canvas.boundingBox())!
  for (let i = 0; i < 5; i++) {
    await page.mouse.click(box.x + box.width / 2, box.y + box.height * 0.65)
  }
  await expect(page.getByRole('button', { name: '再试一次', exact: true })).toBeVisible()
  await expect(page.locator('.hint-toast')).toHaveCount(0)
  await page.getByRole('button', { name: '再试一次', exact: true }).click()
  await expect(page.getByRole('button', { name: '提示', exact: true })).toBeVisible()
  await page.waitForTimeout(100)
  await page.mouse.click(box.x + box.width / 2, box.y + box.height * 0.45)
  await expect(page.getByRole('button', { name: '下一关', exact: true })).toBeVisible()
})
