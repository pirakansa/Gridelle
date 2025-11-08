import { resolve } from 'path'
import { defineConfig } from 'vite'
import { visualizer } from 'rollup-plugin-visualizer'
import { VitePWA } from 'vite-plugin-pwa'
import react from '@vitejs/plugin-react'
import tailwindcss from 'tailwindcss'
import autoprefixer from 'autoprefixer'
import tailwindConfig from './tailwind.config'
import vitePwaConfig from './vite-pwa.config'

const ROOT_DIR = resolve(__dirname, 'src')

export default defineConfig({
  plugins: [
    react(),
    visualizer({ filename: 'bundle-analysis.html' }),
    VitePWA(vitePwaConfig)
  ],
  css: {
    postcss: {
      plugins: [
        tailwindcss(tailwindConfig),
        autoprefixer(),
      ],
    },
  },
  envDir: __dirname,
  root: ROOT_DIR,
  publicDir: resolve(__dirname, 'public'),
  build: {
    outDir: resolve(__dirname, 'dist'),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        index: resolve(ROOT_DIR, 'index.html'),
        top: resolve(ROOT_DIR, 'top.html'),
      },
      output: {
        manualChunks: {},
      },
    },
  },
  
})
