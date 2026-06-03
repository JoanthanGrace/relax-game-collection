import { defineWorkspace } from 'vitest/config'
import { resolve } from 'path'

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
    resolve: {
      alias: {
        '@nicetap/shared': resolve(__dirname, 'packages/shared/src/index.ts'),
        '@nicetap/levels': resolve(__dirname, 'packages/levels/src/index.ts'),
      },
    },
    test: {
      name: 'game-core',
      root: 'packages/game-core',
      include: ['src/**/*.test.ts'],
    },
  },
  {
    extends: 'packages/levels/vitest.config.ts',
    resolve: {
      alias: {
        '@nicetap/shared': resolve(__dirname, 'packages/shared/src/index.ts'),
      },
    },
    test: {
      name: 'levels',
      root: 'packages/levels',
      include: ['src/**/*.test.ts'],
    },
  },
])
