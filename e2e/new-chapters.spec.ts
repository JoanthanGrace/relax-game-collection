import { expect, test, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { LevelConfig } from '../packages/shared/src/types/level'

type Action = {
  type: 'tap' | 'drag' | 'hold' | 'swipe' | 'wait'
  id?: string
  ms?: number
  dx?: number
  dy?: number
  count?: number
}
const tap = (id: string, count = 1): Action => ({ type: 'tap', id, count })
const drag = (id: string): Action => ({ type: 'drag', id })
const hold = (id: string, ms: number): Action => ({ type: 'hold', id, ms })
const solutions: Record<number, Action[]> = {
  31: [drag('work')],
  32: [tap('beans'), tap('water')],
  33: [hold('stamp', 1500)],
  34: [drag('key'), drag('snack'), drag('pen')],
  35: [{ type: 'wait', ms: 3500 }],
  36: [drag('helper')],
  37: [drag('four'), drag('five')],
  38: [{ type: 'wait', ms: 2500 }, tap('real')],
  39: [{ type: 'swipe', id: 'plane', dy: -110 }],
  40: [drag('laptop'), hold('light', 1200), tap('leave')],
  41: [tap('switch-a'), tap('switch-c')],
  42: [drag('plug')],
  43: [hold('screw', 1900)],
  44: [{ type: 'swipe', id: 'mirror', dx: -110 }],
  45: [tap('power'), tap('lamp')],
  46: [drag('knob')],
  47: [drag('round')],
  48: [tap('battery', 3)],
  49: [tap('three'), tap('two'), tap('one')],
  50: [hold('screw', 1500), drag('plug'), tap('power')],
}

function configFor(n: number): LevelConfig {
  return JSON.parse(
    readFileSync(
      resolve('packages/levels/src/configs', `level-${String(n).padStart(3, '0')}.json`),
      'utf8',
    ),
  )
}

async function act(page: Page, config: LevelConfig, action: Action) {
  if (action.type === 'wait') {
    await page.waitForTimeout(action.ms!)
    return
  }
  const object = config.objects.find((obj) => obj.id === action.id)!
  const box = (await page.locator('canvas').boundingBox())!
  const x = box.x + object.position.x * box.width
  const y = box.y + object.position.y * box.height
  if (action.type === 'tap') {
    for (let i = 0; i < (action.count ?? 1); i++) {
      await page.mouse.click(x, y)
      await page.waitForTimeout(100)
    }
  } else {
    await page.mouse.move(x, y)
    await page.mouse.down()
    if (action.type === 'hold') await page.waitForTimeout(action.ms!)
    else if (action.type === 'drag') {
      const target = object.interactions!.find((interaction) => interaction.type === 'drag')!
        .dragTarget!.position!
      await page.mouse.move(box.x + target.x * box.width, box.y + target.y * box.height, {
        steps: 12,
      })
    } else
      await page.mouse.move(
        x + ((action.dx ?? 0) * box.width) / 400,
        y + ((action.dy ?? 0) * box.height) / 600,
        { steps: 12 },
      )
    await page.mouse.up()
  }
}

for (const viewport of [
  { width: 320, height: 740 },
  { width: 390, height: 844 },
]) {
  test.describe(`New chapters at ${viewport.width}px`, () => {
    test.use({ viewport })
    for (let n = 31; n <= 50; n++) {
      test(`level ${n} completes through real pointer input`, async ({ page }) => {
        const config = configFor(n)
        const errors: string[] = []
        page.on('pageerror', (error) => errors.push(error.message))
        await page.goto(`/game/${config.id}`, { waitUntil: 'networkidle' })
        await expect(page.locator('canvas')).toBeVisible()
        const fits = await page.evaluate(() => {
          const canvas = document.querySelector('canvas')!.getBoundingClientRect()
          const area = document.querySelector('.game-area')!.getBoundingClientRect()
          return (
            canvas.left >= area.left - 1 &&
            canvas.right <= area.right + 1 &&
            canvas.top >= area.top - 1 &&
            canvas.bottom <= area.bottom + 1
          )
        })
        expect(fits).toBe(true)
        for (const action of solutions[n]) await act(page, config, action)
        await expect(page.locator('.win-overlay')).toBeVisible()
        expect(
          await page.evaluate(
            () => JSON.parse(localStorage.getItem('nicetap:progress:v1')!).completedLevelIds,
          ),
        ).toContain(config.id)
        expect(errors).toEqual([])
      })
    }
  })
}

test('wrong recipe order and toggle choices can be recovered without resetting', async ({
  page,
}) => {
  await page.goto('/game/level-032', { waitUntil: 'networkidle' })
  const coffee = configFor(32)
  await act(page, coffee, tap('water'))
  await act(page, coffee, tap('beans'))
  await expect(page.locator('.win-overlay')).toHaveCount(0)
  await act(page, coffee, tap('water'))
  await expect(page.locator('.win-overlay')).toBeVisible()
  await page.goto('/game/level-041', { waitUntil: 'networkidle' })
  const switches = configFor(41)
  for (const id of ['switch-a', 'switch-b', 'switch-c']) await act(page, switches, tap(id))
  await expect(page.locator('.win-overlay')).toHaveCount(0)
  await act(page, switches, tap('switch-b'))
  await expect(page.locator('.win-overlay')).toBeVisible()
})

test('old 30-level completion saves continue into chapter four', async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() =>
    localStorage.setItem(
      'nicetap:progress:v1',
      JSON.stringify({
        completedLevelIds: Array.from(
          { length: 30 },
          (_, i) => `level-${String(i + 1).padStart(3, '0')}`,
        ),
      }),
    ),
  )
  await page.reload()
  await page.getByRole('button', { name: '继续游戏', exact: true }).click()
  await expect(page).toHaveURL(/\/game\/level-031$/)
})
