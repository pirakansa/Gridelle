import { resolve } from 'path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: resolve(__dirname, 'src/setupTests.ts'),
    globals: true,
    css: true,
    pool: 'threads',
    minWorkers: 1,
    maxWorkers: 1,
    poolOptions: {
      threads: {
        singleThread: true,
      },
    },
  },
})
