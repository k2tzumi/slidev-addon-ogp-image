import { defineConfig } from 'vite'
import { ogpProxyPlugin } from './server/ogp-proxy'

export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    cssMinify: false
  },
  define: {
    'global.fetch': 'globalThis.fetch'
  },
  plugins: [ogpProxyPlugin()],
  optimizeDeps: {
    exclude: ['node-fetch', 'fetch-blob', 'node-domexception']
  }
})