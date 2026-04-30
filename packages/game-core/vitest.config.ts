import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  resolve: {
    alias: {
      '@nicetap/shared': resolve(__dirname, '../shared/src/index.ts'),
      '@nicetap/levels': resolve(__dirname, '../levels/src/index.ts'),
    },
  },
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
})
