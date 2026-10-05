import { expect, it } from 'vitest'
import { getAllLevels, getChapterCount, getLevelsByChapter } from '../index'

it('ships exactly fifty unique levels in five complete chapters', () => {
  expect(getAllLevels()).toHaveLength(50)
  expect(getChapterCount()).toBe(5)
  for (let chapter = 1; chapter <= 5; chapter++)
    expect(getLevelsByChapter(chapter)).toHaveLength(10)
})

it('new chapters have varied inputs, layered hints, and bounded authored sizes', () => {
  for (const chapter of [4, 5]) {
    const interactions = new Set<string>()
    for (const level of getLevelsByChapter(chapter)) {
      expect(level.hints!.length).toBeGreaterThanOrEqual(2)
      expect(level.failFeedback.texts[0].length).toBeGreaterThan(0)
      for (const object of level.objects) {
        for (const interaction of object.interactions ?? []) interactions.add(interaction.type)
        if (!object.size) continue
        const origin = object.type === 'shape' ? 0 : 0.5
        expect(object.position.x - object.size.x * origin).toBeGreaterThanOrEqual(0)
        expect(object.position.y - object.size.y * origin).toBeGreaterThanOrEqual(0)
        expect(object.position.x + object.size.x * (1 - origin)).toBeLessThanOrEqual(1)
        expect(object.position.y + object.size.y * (1 - origin)).toBeLessThanOrEqual(1)
      }
    }
    expect(interactions.size).toBeGreaterThanOrEqual(5)
  }
})
