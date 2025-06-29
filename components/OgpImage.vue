<template>
  <div class="ogp-image-container" :class="{ loading: isLoading }">
    <div v-if="isLoading" class="loading-spinner">
      Loading OGP data...
    </div>
    <div v-else-if="error" class="error-message">
      Failed to load: {{ error }}
    </div>
    <div v-else class="ogp-content" @click="openUrl">
      <div v-if="ogpData?.image" class="ogp-with-image">
        <img 
          :src="ogpData.image" 
          :alt="ogpData.title"
          class="ogp-image"
          @error="handleImageError"
        />
        <div class="ogp-text-content">
          <h3>{{ ogpData.title }}</h3>
          <p v-if="ogpData.description">{{ ogpData.description }}</p>
          <small>{{ ogpData.siteName || domain }}</small>
        </div>
      </div>
      <div v-else class="ogp-fallback">
        <h3>{{ ogpData?.title }}</h3>
        <p v-if="ogpData?.description">{{ ogpData.description }}</p>
        <small>{{ ogpData?.siteName || domain }}</small>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'

interface OgpData {
  title: string
  description?: string
  image?: string
  url: string
  siteName?: string
}

interface Props {
  url: string
  width?: number
  height?: number
  template?: string
  generateImage?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  width: 1200,
  height: 630,
  generateImage: false // Set to false by default for browser compatibility
})

const ogpData = ref<OgpData | null>(null)
const isLoading = ref(true)
const error = ref<string | null>(null)
const imageError = ref(false)

const domain = computed(() => {
  try {
    return new URL(props.url).hostname
  } catch {
    return props.url
  }
})

const openUrl = () => {
  window.open(props.url, '_blank')
}

const handleImageError = () => {
  console.warn('Failed to load OGP image')
  imageError.value = true
}

// Enhanced OGP data fetcher with multiple proxy options
async function fetchOgpData(url: string): Promise<OgpData> {
  const proxies = [
    // Primary proxy
    `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`,
    // Alternative proxy
    `https://corsproxy.io/?${encodeURIComponent(url)}`,
    // Another option
    `https://cors-anywhere.herokuapp.com/${url}`
  ]
  
  for (const proxyUrl of proxies) {
    try {
      console.log(`Trying to fetch OGP data from: ${url}`)
      const response = await fetch(proxyUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; OGP-Bot/1.0)'
        }
      })
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      
      let html: string
      
      // Handle different proxy response formats
      if (proxyUrl.includes('allorigins.win')) {
        const data = await response.json()
        html = data.contents
      } else {
        html = await response.text()
      }
      
      console.log('HTML fetched successfully, extracting OGP data...')
      
      const ogpData: OgpData = { url }
      
      // Extract OGP meta tags with more robust regex
      const ogTitleMatch = html.match(/<meta\s+property=["']og:title["']\s+content=["']([^"']*?)["']/i)
      const ogDescriptionMatch = html.match(/<meta\s+property=["']og:description["']\s+content=["']([^"']*?)["']/i)
      const ogImageMatch = html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']*?)["']/i)
      const ogSiteNameMatch = html.match(/<meta\s+property=["']og:site_name["']\s+content=["']([^"']*?)["']/i)
      
      // Alternative meta tag formats
      const altImageMatch = html.match(/<meta\s+name=["']twitter:image["']\s+content=["']([^"']*?)["']/i)
      const altTitleMatch = html.match(/<meta\s+name=["']twitter:title["']\s+content=["']([^"']*?)["']/i)
      
      // Fallback to title tag
      const titleMatch = html.match(/<title[^>]*>([^<]*?)<\/title>/i)
      
      ogpData.title = ogTitleMatch?.[1] || altTitleMatch?.[1] || titleMatch?.[1] || 'No Title'
      ogpData.description = ogDescriptionMatch?.[1]
      ogpData.image = ogImageMatch?.[1] || altImageMatch?.[1]
      ogpData.siteName = ogSiteNameMatch?.[1]
      
      // Clean up HTML entities
      if (ogpData.title) {
        ogpData.title = ogpData.title.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
      }
      if (ogpData.description) {
        ogpData.description = ogpData.description.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
      }
      
      console.log('OGP data extracted:', ogpData)
      return ogpData
      
    } catch (error) {
      console.warn(`Failed to fetch from ${proxyUrl}:`, error)
      continue
    }
  }
  
  // If all proxies fail, return fallback data
  console.error('All proxy attempts failed for:', url)
  return {
    url,
    title: 'Failed to load',
    description: 'Unable to fetch page data due to CORS restrictions'
  }
}

onMounted(async () => {
  try {
    console.log('Fetching OGP data for:', props.url)
    
    // Fetch OGP data
    ogpData.value = await fetchOgpData(props.url)
    
    console.log('OGP data received:', ogpData.value)
    
    isLoading.value = false
  } catch (err) {
    console.error('Error in onMounted:', err)
    error.value = err instanceof Error ? err.message : 'Unknown error'
    isLoading.value = false
  }
})
</script>

<style scoped>
.ogp-image-container {
  max-width: 100%;
  margin: 1rem 0;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s ease;
}

.ogp-image-container:hover {
  transform: translateY(-2px);
}

.loading-spinner {
  padding: 2rem;
  text-align: center;
  color: #666;
}

.error-message {
  padding: 1rem;
  background: #fee;
  color: #c33;
  text-align: center;
}

.ogp-content {
  cursor: pointer;
}

.ogp-with-image {
  display: flex;
  gap: 1rem;
  align-items: flex-start;
}

.ogp-image {
  width: 120px;
  height: 80px;
  object-fit: cover;
  border-radius: 4px;
  flex-shrink: 0;
}

.ogp-text-content {
  flex: 1;
  min-width: 0;
}

.ogp-text-content h3 {
  margin: 0 0 0.5rem 0;
  color: #333;
  font-size: 1.1rem;
  line-height: 1.3;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.ogp-text-content p {
  margin: 0 0 0.5rem 0;
  color: #666;
  font-size: 0.85rem;
  line-height: 1.3;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.ogp-text-content small {
  color: #999;
  font-size: 0.75rem;
}

.ogp-fallback {
  padding: 1.5rem;
  background: #f8f9fa;
  border-left: 4px solid #007acc;
}

.ogp-fallback h3 {
  margin: 0 0 0.5rem 0;
  color: #333;
  font-size: 1.2rem;
}

.ogp-fallback p {
  margin: 0 0 1rem 0;
  color: #666;
  font-size: 0.9rem;
  line-height: 1.4;
}

.ogp-fallback small {
  color: #999;
  font-size: 0.8rem;
}
</style>