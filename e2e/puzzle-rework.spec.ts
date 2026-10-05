import { expect, test, type Page } from '@playwright/test'

async function point(page: Page, x: number, y: number) {
  const box = (await page.locator('canvas').boundingBox())!
  return { x: box.x + (x / 400) * box.width, y: box.y + (y / 600) * box.height }
}
async function tap(page: Page, x: number, y: number) {
  const p = await point(page, x, y)
  await page.mouse.click(p.x, p.y)
  await page.waitForTimeout(60)
}
async function drag(page: Page, x: number, y: number, tx: number, ty: number) {
  const from = await point(page, x, y),
    to = await point(page, tx, ty)
  await page.mouse.move(from.x, from.y)
  await page.mouse.down()
  await page.mouse.move(to.x, to.y, { steps: 15 })
  await page.mouse.up()
  await page.waitForTimeout(100)
}
const arrows = { up: [200, 472], right: [257, 514], down: [200, 524], left: [143, 514] } as const
async function moves(page: Page, directions: (keyof typeof arrows)[]) {
  for (const direction of directions) await tap(page, ...arrows[direction])
}
async function solution(page: Page, n: number) {
  if (n === 31) {
    await drag(page, 283, 85, 283, 148)
    await moves(page, ['right', 'right', 'right'])
  }
  if (n === 32)
    await moves(page, ['up', 'up', 'right', 'left', 'down', 'down', 'right', 'right', 'up', 'up'])
  if (n === 33)
    for (const [index, count] of [
      [4, 1],
      [5, 2],
      [9, 2],
      [10, 1],
      [11, 2],
      [15, 1],
    ]) {
      for (let i = 0; i < count; i++)
        await tap(page, 56 + ((index % 4) + 0.5) * 72, 140 + (Math.floor(index / 4) + 0.5) * 72)
    }
  if (n === 34)
    for (const index of [5, 0, 1, 2, 3, 8, 13, 18, 23, 24, 19, 14])
      await tap(page, 50 + ((index % 5) + 0.5) * 60, 125 + (Math.floor(index / 5) + 0.5) * 60)
  if (n === 35) {
    await drag(page, 112, 199, 288, 199)
    await drag(page, 112, 375, 288, 375)
    await drag(page, 288, 199, 288, 375)
  }
}
for (const width of [320, 390]) {
  test.describe(`Reasoning prototypes at ${width}px`, () => {
    test.use({ viewport: { width, height: width === 320 ? 740 : 844 } })
    for (let n = 31; n <= 35; n++)
      test(`level ${n} solves through its real mechanic`, async ({ page }) => {
        const errors: string[] = []
        page.on('pageerror', (error) => errors.push(error.message))
        await page.goto(`/game/level-0${n}`, { waitUntil: 'networkidle' })
        await expect(page.locator('canvas')).toBeVisible()
        expect(
          await page.evaluate(() => {
            const canvas = document.querySelector('canvas')!.getBoundingClientRect()
            const area = document.querySelector('.game-area')!.getBoundingClientRect()
            return (
              canvas.left >= area.left - 1 &&
              canvas.right <= area.right + 1 &&
              canvas.top >= area.top - 1 &&
              canvas.bottom <= area.bottom + 1
            )
          }),
        ).toBe(true)
        await expect(page.locator('.win-overlay')).toHaveCount(0)
        await expect(page.locator('.hint-toast')).toHaveCount(0)
        await solution(page, n)
        await expect(page.locator('.win-overlay')).toBeVisible()
        expect(
          await page.evaluate(
            () => JSON.parse(localStorage.getItem('nicetap:progress:v1')!).completedLevelIds,
          ),
        ).toContain(`level-0${n}`)
        expect(errors).toEqual([])
      })
  })
}
test('rules remain blocked before rewriting and undo restores the original contract', async ({
  page,
}) => {
  await page.goto('/game/level-031', { waitUntil: 'networkidle' })
  await moves(page, ['right', 'right', 'right'])
  await expect(page.locator('.win-overlay')).toHaveCount(0)
  await drag(page, 283, 85, 283, 148)
  await page.getByRole('button', { name: '撤销一步', exact: true }).click()
  await moves(page, ['right'])
  await expect(page.locator('.win-overlay')).toHaveCount(0)
  await page.getByRole('button', { name: '重置关卡', exact: true }).click()
  await solution(page, 31)
  await expect(page.locator('.win-overlay')).toBeVisible()
})
test('a trapped crate can be undone and the puzzle remains solvable', async ({ page }) => {
  await page.goto('/game/level-032', { waitUntil: 'networkidle' })
  await moves(page, ['up', 'up', 'down', 'right', 'up'])
  await expect(page.locator('.win-overlay')).toHaveCount(0)
  await page.getByRole('button', { name: '撤销一步', exact: true }).click()
  await page.getByRole('button', { name: '重置关卡', exact: true }).click()
  await solution(page, 32)
  await expect(page.locator('.win-overlay')).toBeVisible()
})
test('route shortcuts do not win and reset restores parcels', async ({ page }) => {
  await page.goto('/game/level-034', { waitUntil: 'networkidle' })
  await tap(page, 320, 275)
  await tap(page, 140, 275)
  await tap(page, 200, 275)
  await expect(page.locator('.win-overlay')).toHaveCount(0)
  await page.getByRole('button', { name: '重置关卡', exact: true }).click()
  await solution(page, 34)
  await expect(page.locator('.win-overlay')).toBeVisible()
})
test('home provides a direct playtest entry without erasing progression', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: '试玩重做关卡', exact: true }).click()
  await expect(page).toHaveURL(/\/game\/level-031$/)
})

test.describe('Touch input on a portrait phone', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
  test('rule paper can be dragged and the actor moved with touch', async ({ page }) => {
    await page.goto('/game/level-031', { waitUntil: 'networkidle' })
    const from = await point(page, 283, 85),
      to = await point(page, 283, 148)
    const cdp = await page.context().newCDPSession(page)
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{ x: from.x, y: from.y, id: 1 }],
    })
    for (let i = 1; i <= 12; i++) {
      await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [{ x: from.x, y: from.y + ((to.y - from.y) * i) / 12, id: 1 }],
      })
      await page.waitForTimeout(20)
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    const right = await point(page, 257, 514)
    for (let i = 0; i < 3; i++) {
      await page.touchscreen.tap(right.x, right.y)
      await page.waitForTimeout(100)
    }
    await expect(page.locator('.win-overlay')).toBeVisible()
    await cdp.detach()
  })
  test('pipe rotation accepts touch taps rather than mouse-only input', async ({ page }) => {
    await page.goto('/game/level-033', { waitUntil: 'networkidle' })
    for (const [index, count] of [
      [4, 1],
      [5, 2],
      [9, 2],
      [10, 1],
      [11, 2],
      [15, 1],
    ]) {
      const p = await point(
        page,
        56 + ((index % 4) + 0.5) * 72,
        140 + (Math.floor(index / 4) + 0.5) * 72,
      )
      for (let i = 0; i < count; i++) {
        await page.touchscreen.tap(p.x, p.y)
        await page.waitForTimeout(100)
      }
    }
    await expect(page.locator('.win-overlay')).toBeVisible()
  })
})
