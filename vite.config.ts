import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: true
  },
  define: {
    'global.fetch': 'globalThis.fetch'
  },
  optimizeDeps: {
    exclude: ['node-fetch', 'fetch-blob', 'node-domexception']
  }
})