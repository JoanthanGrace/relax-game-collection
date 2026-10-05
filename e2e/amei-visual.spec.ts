import { expect, test } from '@playwright/test'

test.use({ viewport: { width: 320, height: 740 }, isMobile: true, hasTouch: true })

test('Amei home keeps all levels accessible without horizontal overflow', async ({ page }) => {
  await page.goto('/')
  const mascot = page.getByRole('img', { name: /王阿妹/ })
  await expect(mascot).toBeVisible()
  expect(
    await mascot.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0),
  ).toBe(true)
  await expect(page.locator('.level-card')).toHaveCount(50)
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth <= innerWidth &&
        document.querySelector('.home-page')!.scrollWidth <= innerWidth,
    ),
  ).toBe(true)
  await page.getByRole('button', { name: '第 2 章', exact: true }).click()
  await expect(page.getByRole('heading', { name: '反套路实验' })).toBeInViewport()
})

test('toy weather scene loads its bitmap and keeps hints and drag completion working', async ({
  page,
}) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  const imageLoaded = page.waitForResponse(
    (response) => response.url().endsWith('/art/amei-teammate-v1.png') && response.status() === 200,
  )
  await page.goto('/game/level-008')
  await imageLoaded
  const canvas = page.locator('canvas')
  await expect(canvas).toBeVisible()
  await page.getByRole('button', { name: '提示', exact: true }).click()
  await expect(page.locator('.hint-toast')).toContainText('试试拖动看看')
  await page.getByRole('button', { name: '✕', exact: true }).click()
  const box = (await canvas.boundingBox())!
  await page.mouse.move(box.x + box.width / 2, box.y + box.height * 0.35)
  await page.mouse.down()
  await page.mouse.move(box.x + 1, box.y + box.height * 0.35, { steps: 20 })
  await page.mouse.up()
  await expect(page.getByRole('button', { name: '跳过 · 3/3', exact: true })).toBeDisabled()
  await expect(page.getByRole('button', { name: '下一关', exact: true })).toBeVisible()
  expect(errors).toEqual([])
})
