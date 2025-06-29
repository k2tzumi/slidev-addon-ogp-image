import { defineAppSetup } from '@slidev/types'

export default defineAppSetup(({ app }) => {
  // Register OGP Image component globally
  if (typeof window !== 'undefined') {
    // Client-side only: register the component
    import('../components/OgpImage.vue').then((module) => {
      app.component('OgpImage', module.default)
    })
  }
})
