import { defineWorkspace } from 'vitest/config'

export default defineWorkspace([
  {
    extends: 'packages/shared/vitest.config.ts',
    test: {
      name: 'shared',
      root: 'packages/shared',
      include: ['src/**/*.test.ts'],
    },
  },
  {
    extends: 'packages/game-core/vitest.config.ts',
    test: {
      name: 'game-core',
      root: 'packages/game-core',
      include: ['src/**/*.test.ts'],
    },
  },
  {
    extends: 'packages/levels/vitest.config.ts',
    test: {
      name: 'levels',
      root: 'packages/levels',
      include: ['src/**/*.test.ts'],
    },
  },
])
