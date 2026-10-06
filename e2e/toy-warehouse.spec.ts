import { expect, test } from '@playwright/test'

for (const width of [320, 390, 1280]) {
  test(`3D warehouse renders and moves at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: width === 1280 ? 800 : 844 })
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    await page.goto('/game/level-032', { waitUntil: 'networkidle' })
    const canvas = page.locator('canvas[aria-label="立体玩具仓库"]')
    await expect(canvas).toBeVisible()
    await expect
      .poll(async () => Number(await canvas.getAttribute('data-frame')))
      .toBeGreaterThan(2)
    const before = await canvas.screenshot()
    const pixels = await page.evaluate(
      async (data) => {
        const image = new Image()
        image.src = data
        await image.decode()
        const copy = document.createElement('canvas')
        copy.width = image.width
        copy.height = image.height
        const ctx = copy.getContext('2d')!
        ctx.drawImage(image, 0, 0)
        const rgba = ctx.getImageData(0, 0, copy.width, copy.height).data
        const colors = new Set<string>()
        let distinct = 0
        for (let i = 0; i < rgba.length; i += 16) {
          colors.add(`${rgba[i] >> 4},${rgba[i + 1] >> 4},${rgba[i + 2] >> 4}`)
          if (
            Math.abs(rgba[i] - rgba[0]) +
              Math.abs(rgba[i + 1] - rgba[1]) +
              Math.abs(rgba[i + 2] - rgba[2]) >
            35
          )
            distinct++
        }
        return { colors: colors.size, fraction: distinct / (rgba.length / 16) }
      },
      `data:image/png;base64,${before.toString('base64')}`,
    )
    expect(pixels.colors).toBeGreaterThan(25)
    expect(pixels.fraction).toBeGreaterThan(0.06)
    await page.screenshot({ path: `/tmp/nicetap-warehouse-${width}.png` })
    const firstFrame = Number(await canvas.getAttribute('data-frame'))
    await page.locator('[data-direction="up"]').click()
    await expect(page.locator('.warehouse-status')).toContainText('1 步')
    await page.waitForTimeout(220)
    expect((await canvas.screenshot()).equals(before)).toBe(false)
    expect(Number(await canvas.getAttribute('data-frame'))).toBeGreaterThan(firstFrame)
    await page.getByRole('button', { name: '撤销一步', exact: true }).click()
    await expect(page.locator('.warehouse-status')).toContainText('0 步')
    await page.getByRole('button', { name: '提示', exact: true }).click()
    await expect(page.locator('.hint-toast')).toBeVisible()
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true)
    expect(errors).toEqual([])
  })
}

test.describe('warehouse on a touch phone', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
  test('touch controls solve and persist the level', async ({ page }) => {
    await page.goto('/game/level-032', { waitUntil: 'networkidle' })
    for (const direction of [
      'up',
      'up',
      'right',
      'left',
      'down',
      'down',
      'right',
      'right',
      'up',
      'up',
    ]) {
      await page.locator(`[data-direction="${direction}"]`).tap()
      await page.waitForTimeout(220)
    }
    await expect(page.locator('.win-overlay')).toBeVisible()
    expect(
      await page.evaluate(
        () => JSON.parse(localStorage.getItem('nicetap:progress:v1')!).completedLevelIds,
      ),
    ).toContain('level-032')
  })
})

test('WebGL failure falls back to the playable 2D scene', async ({ page }) => {
  await page.addInitScript(() => {
    const get = HTMLCanvasElement.prototype.getContext
    HTMLCanvasElement.prototype.getContext = function (type: string, ...args: unknown[]) {
      if (type === 'webgl2') return null
      return get.call(this, type as '2d', ...(args as []))
    } as typeof get
  })
  await page.goto('/game/level-032', { waitUntil: 'networkidle' })
  await expect(page.locator('canvas')).toBeVisible()
  await expect(page.locator('.warehouse')).toHaveCount(0)
})
