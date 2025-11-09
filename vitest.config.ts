import { resolve } from 'path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  define: {
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(process.env.npm_package_version ?? '0.0.0'),
  },
  test: {
    environment: 'jsdom',
    setupFiles: resolve(__dirname, 'src/setupTests.ts'),
    globals: true,
    css: true,
    pool: 'threads',
    maxWorkers: 1,
    isolate: true,
  },
})
