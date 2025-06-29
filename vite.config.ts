import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'index.ts'),
      name: 'SlidevAddonOgpImage',
      fileName: 'index'
    },
    rollupOptions: {
      external: ['@slidev/types', 'vue', 'canvas'],
      output: {
        globals: {
          vue: 'Vue',
          '@slidev/types': 'SlidevTypes'
        }
      }
    }
  }
})
