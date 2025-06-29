<template>
  <!-- Fixed container with proper responsive design and image overflow prevention -->
  <div 
    class="ogp-image-container" 
    :class="{ 'loading': isLoading, 'has-error': error }"
    :style="containerStyles"
  >
    <!-- Loading state with improved spinner -->
    <div v-if="isLoading" class="loading-spinner">
      <div class="spinner-icon"></div>
      <span>Loading OGP data...</span>
    </div>
    
    <!-- Error state with better error handling -->
    <div v-else-if="error" class="error-message">
      <div class="error-icon">⚠️</div>
      <div class="error-content">
        <div class="error-title">Failed to load</div>
        <div class="error-detail">{{ error }}</div>
        <div class="error-url">{{ url }}</div>
      </div>
    </div>
    
    <!-- Main content with improved layout structure -->
    <div v-else class="ogp-content" @click="openUrl">
      <!-- Layout with image - Fixed image container to prevent overflow -->
      <div v-if="ogpData?.image && !imageError" class="ogp-with-image">
        <div class="ogp-image-wrapper">
          <img 
            :src="ogpData.image" 
            :alt="ogpData.title || 'OGP Image'"
            class="ogp-image"
            @error="handleImageError"
            @load="handleImageLoad"
          />
        </div>
        <div class="ogp-text-content">
          <h3 class="ogp-title">{{ ogpData.title }}</h3>
          <p v-if="ogpData.description" class="ogp-description">{{ ogpData.description }}</p>
          <div class="ogp-site-info">
            <span class="ogp-site-name">{{ ogpData.siteName || domain }}</span>
          </div>
        </div>
      </div>
      
      <!-- Fallback layout without image - Improved spacing and typography -->
      <div v-else class="ogp-fallback">
        <div class="fallback-icon">🔗</div>
        <div class="fallback-content">
          <h3 class="fallback-title">{{ ogpData?.title || 'Untitled' }}</h3>
          <p v-if="ogpData?.description" class="fallback-description">{{ ogpData.description }}</p>
          <div class="fallback-site-info">
            <span v-if="props.showFavicon && faviconUrl" class="ogp-favicon">
              <img
                :src="faviconUrl"
                :alt="`${ogpData?.siteName || domain} favicon`"
                :width="props.faviconSize"
                :height="props.faviconSize"
                style="vertical-align: middle; margin-right: 4px; border-radius: 3px;"
                @error="faviconUrl = null"
              />
            </span>
            <span class="ogp-site-name">{{ ogpData?.siteName || domain }}</span>
          </div>
        </div>
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
  maxWidth?: string
  maxHeight?: string
  showFavicon?: boolean
  faviconSize?: number
}

const props = withDefaults(defineProps<Props>(), {
  width: 1200,
  height: 630,
  maxWidth: '100%',
  maxHeight: '300px',
  showFavicon: true,
  faviconSize: 16
})

const ogpData = ref<OgpData | null>(null)
const isLoading = ref(true)
const error = ref<string | null>(null)
const imageError = ref(false)
const imageLoaded = ref(false)
const faviconUrl = ref<string | null>(null)

// Get favicon with Google S2 Favicon API
const setFaviconUrl = () => {
  try {
    const host = new URL(props.url).hostname
    faviconUrl.value = `https://www.google.com/s2/favicons?sz=${props.faviconSize}&domain=${host}`
  } catch {
    faviconUrl.value = null
  }
}

onMounted(async () => {
  try {
    console.log('Initializing OGP fetch for:', props.url)
    isLoading.value = true
    error.value = null
    imageError.value = false
    imageLoaded.value = false

    // OGPデータ取得
    ogpData.value = await fetchOgpData(props.url)
    // favicon取得（showFaviconがtrueの場合のみ）
    if (props.showFavicon) {
      setFaviconUrl()
    }
    console.log('OGP data received:', ogpData.value)
  } catch (err) {
    console.error('Error fetching OGP data:', err)
    error.value = err instanceof Error ? err.message : 'Unknown error occurred'
    ogpData.value = {
      url: props.url,
      title: 'Failed to load',
      description: 'Unable to fetch page data'
    }
  } finally {
    isLoading.value = false
  }
})

// Enhanced OGP data fetcher with improved error handling and multiple proxy support
async function fetchOgpData(url: string): Promise<OgpData> {
  const proxies = [
    // Primary proxy with better reliability
    `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`,
    // Alternative proxy for fallback
    `https://corsproxy.io/?${encodeURIComponent(url)}`,
    // Additional backup option
    `https://cors-anywhere.herokuapp.com/${url}`
  ]
  
  for (const proxyUrl of proxies) {
    try {
      console.log(`Attempting to fetch OGP data from: ${url} via ${proxyUrl}`)
      const response = await fetch(proxyUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; OGP-Bot/1.0; +https://ogp.me/)',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        },
        // Add timeout to prevent hanging requests
        signal: AbortSignal.timeout(10000)
      })
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      let html: string
      
      // Handle different proxy response formats with better parsing
      if (proxyUrl.includes('allorigins.win')) {
        const data = await response.json()
        html = data.contents
        if (!html || html.trim() === '') {
          throw new Error('Empty response from proxy')
        }
      } else {
        html = await response.text()
      }
      
      console.log('HTML fetched successfully, extracting OGP data...')
      
      const ogpData: OgpData = { 
        url,
        title: 'Untitled' // Default fallback title
      }
      
      // Enhanced regex patterns with better attribute handling
      const ogTitleMatch = html.match(/<meta\s+(?:property=["']og:title["']|name=["']og:title["'])\s+content=["']([^"']*?)["']/i)
      const ogDescriptionMatch = html.match(/<meta\s+(?:property=["']og:description["']|name=["']description["'])\s+content=["']([^"']*?)["']/i)
      const ogImageMatch = html.match(/<meta\s+(?:property=["']og:image["']|name=["']og:image["'])\s+content=["']([^"']*?)["']/i)
      const ogSiteNameMatch = html.match(/<meta\s+(?:property=["']og:site_name["']|name=["']og:site_name["'])\s+content=["']([^"']*?)["']/i)
      
      // Enhanced Twitter Card fallbacks
      const twitterImageMatch = html.match(/<meta\s+name=["']twitter:image(?::src)?["']\s+content=["']([^"']*?)["']/i)
      const twitterTitleMatch = html.match(/<meta\s+name=["']twitter:title["']\s+content=["']([^"']*?)["']/i)
      const twitterDescMatch = html.match(/<meta\s+name=["']twitter:description["']\s+content=["']([^"']*?)["']/i)
      
      // Improved title tag extraction
      const titleMatch = html.match(/<title[^>]*>([^<]*?)<\/title>/i)
      
      // Better content extraction with HTML entity decoding
      const decodeHtml = (str: string) => {
        return str
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .replace(/&nbsp;/g, ' ')
          .trim()
      }
      
      // Assign extracted data with better fallback chain
      ogpData.title = decodeHtml(
        ogTitleMatch?.[1] || 
        twitterTitleMatch?.[1] || 
        titleMatch?.[1] || 
        'Untitled'
      ).substring(0, 100) // Limit title length to prevent layout issues
      
      const rawDescription = ogDescriptionMatch?.[1] || twitterDescMatch?.[1]
      if (rawDescription) {
        ogpData.description = decodeHtml(rawDescription).substring(0, 200) // Limit description length
      }
      
      const rawImage = ogImageMatch?.[1] || twitterImageMatch?.[1]
      if (rawImage) {
        // Resolve relative URLs to absolute URLs
        try {
          ogpData.image = new URL(rawImage, url).href
        } catch {
          ogpData.image = rawImage // Use as-is if URL parsing fails
        }
      }
      
      const rawSiteName = ogSiteNameMatch?.[1]
      if (rawSiteName) {
        ogpData.siteName = decodeHtml(rawSiteName)
      }
      
      console.log('OGP data extracted successfully:', ogpData)
      return ogpData
      
    } catch (error) {
      console.warn(`Failed to fetch from ${proxyUrl}:`, error)
      continue
    }
  }
  
  // Enhanced fallback data when all proxies fail
  console.error('All proxy attempts failed for:', url)
  throw new Error('Unable to fetch page data due to CORS restrictions or network issues')
}
</script>

<style scoped>
/* Main container with improved overflow handling and responsive design */
.ogp-image-container {
  max-width: 100%;
  margin: 1rem 0;
  border-radius: 12px;
  overflow: hidden; /* Critical: prevents image overflow */
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  background: white;
  border: 1px solid #e1e5e9;
  position: relative; /* Ensures proper stacking context */
}

.ogp-image-container:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  border-color: #1976d2;
}

/* Enhanced loading state with animated spinner */
.loading-spinner {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  min-height: 120px;
  color: #666;
  background: #f8f9fa;
}

.spinner-icon {
  width: 24px;
  height: 24px;
  border: 3px solid #e0e0e0;
  border-top: 3px solid #1976d2;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 0.5rem;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Improved error message design */
.error-message {
  display: flex;
  align-items: center;
  padding: 1.5rem;
  background: #fef2f2;
  border-left: 4px solid #ef4444;
  min-height: 80px;
}

.error-icon {
  font-size: 24px;
  margin-right: 12px;
  flex-shrink: 0;
}

.error-content {
  flex: 1;
  min-width: 0; /* Allows text to shrink and wrap */
}

.error-title {
  font-weight: 600;
  color: #dc2626;
  margin-bottom: 4px;
  font-size: 14px;
}

.error-detail {
  color: #991b1b;
  font-size: 13px;
  margin-bottom: 4px;
}

.error-url {
  color: #6b7280;
  font-size: 12px;
  word-break: break-all; /* Prevents long URLs from overflowing */
}

/* Main content area with click interaction */
.ogp-content {
  cursor: pointer;
  width: 100%; /* Ensures full width utilization */
  box-sizing: border-box;
}

/* Layout with image - Fixed image container dimensions */
.ogp-with-image {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  padding: 1rem;
  min-height: 100px; /* Minimum height for consistent layout */
}

/* Critical fix: Image wrapper with controlled dimensions */
.ogp-image-wrapper {
  flex-shrink: 0; /* Prevents image container from shrinking */
  width: 120px;
  height: 80px;
  overflow: hidden; /* Critical: prevents image overflow */
  border-radius: 8px;
  background: #f5f5f5;
  position: relative;
}

/* Enhanced image styling with proper object-fit */
.ogp-image {
  width: 100%;
  height: 100%;
  object-fit: cover; /* Critical: maintains aspect ratio while filling container */
  object-position: center;
  transition: transform 0.3s ease;
  display: block; /* Removes inline spacing issues */
}

.ogp-content:hover .ogp-image {
  transform: scale(1.05);
}

/* Text content with improved overflow handling */
.ogp-text-content {
  flex: 1;
  min-width: 0; /* Critical: allows flex item to shrink below content size */
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  overflow: hidden; /* Prevents text overflow */
}

/* Enhanced typography with better line clamping */
.ogp-title {
  margin: 0 0 0.5rem 0;
  color: #1a1a1a;
  font-size: 16px;
  font-weight: 600;
  line-height: 1.3;
  /* Critical: Multi-line text truncation */
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  word-wrap: break-word;
  hyphens: auto;
}

.ogp-description {
  margin: 0 0 0.75rem 0;
  color: #666;
  font-size: 14px;
  line-height: 1.4;
  /* Critical: Multi-line text truncation for descriptions */
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  word-wrap: break-word;
}

.ogp-site-info {
  margin-top: auto; /* Pushes to bottom of container */
}

.ogp-site-name {
  color: #999;
  font-size: 12px;
  font-weight: 500;
  /* Single line truncation for site names */
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: block;
}

/* Enhanced fallback layout without image */
.ogp-fallback {
  display: flex;
  align-items: center;
  padding: 1.5rem;
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
  border-left: 4px solid #3b82f6;
  min-height: 80px;
}

.fallback-icon {
  font-size: 28px;
  margin-right: 16px;
  flex-shrink: 0;
  opacity: 0.7;
}

.fallback-content {
  flex: 1;
  min-width: 0; /* Allows content to shrink */
}

.fallback-title {
  margin: 0 0 0.5rem 0;
  color: #1e293b;
  font-size: 18px;
  font-weight: 600;
  line-height: 1.3;
  /* Fallback title truncation */
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.fallback-description {
  margin: 0 0 0.75rem 0;
  color: #475569;
  font-size: 14px;
  line-height: 1.4;
  /* Fallback description truncation */
  display: -webkit-box;
  -webkit-line-clamp: 3;
  line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.fallback-site-info {
  margin-top: auto;
}

.fallback-site-name {
  color: #64748b;
  font-size: 12px;
  font-weight: 500;
  /* Site name truncation */
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: block;
}

/* Enhanced responsive design for mobile devices */
@media (max-width: 640px) {
  .ogp-image-container {
    margin: 0.75rem 0;
  }
  
  .ogp-with-image {
    flex-direction: column;
    padding: 1rem;
    gap: 0.75rem;
  }
  
  /* Mobile: Image takes full width with controlled height */
  .ogp-image-wrapper {
    width: 100%;
    height: 140px; /* Fixed height for mobile layout */
    max-width: 100%;
  }
  
  .ogp-text-content {
    min-width: unset;
  }
  
  .ogp-title {
    font-size: 15px;
    -webkit-line-clamp: 3; /* Allow more lines on mobile */
    line-clamp: 3;
  }
  
  .ogp-description {
    font-size: 13px;
    -webkit-line-clamp: 3;
    line-clamp: 3;
  }
  
  .fallback-content {
    margin-left: 0;
  }
  
  .fallback-title {
    font-size: 16px;
  }
  
  .loading-spinner {
    padding: 1.5rem;
    min-height: 100px;
  }
}

/* Extra small devices */
@media (max-width: 480px) {
  .ogp-with-image {
    padding: 0.75rem;
  }
  
  .ogp-image-wrapper {
    height: 120px;
  }
  
  .fallback-content {
    padding: 1rem;
  }
  
  .error-message {
    padding: 1rem;
    flex-direction: column;
    text-align: center;
  }
  
  .error-icon {
    margin: 0 0 8px 0;
  }
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  .ogp-image-container {
    background: #1f2937;
    border-color: #374151;
    color: #e5e7eb;
  }
  
  .ogp-title {
    color: #f9fafb;
  }
  
  .ogp-description {
    color: #d1d5db;
  }
  
  .ogp-site-name {
    color: #9ca3af;
  }
  
  .loading-spinner {
    background: #111827;
    color: #d1d5db;
  }
  
  .spinner-icon {
    border-color: #374151;
    border-top-color: #3b82f6;
  }
  
  .error-message {
    background: #1f1917;
  }
  
  .ogp-fallback {
    background: linear-gradient(135deg, #1f2937 0%, #111827 100%);
  }
  
  .fallback-title {
    color: #f9fafb;
  }
  
  .fallback-description {
    color: #d1d5db;
  }
  
  .fallback-site-name {
    color: #9ca3af;
  }
}

/* High contrast mode support for accessibility */
@media (prefers-contrast: high) {
  .ogp-image-container {
    border-width: 2px;
    border-color: #000;
  }
  
  .ogp-title {
    font-weight: 700;
  }
  
  .loading-spinner {
    border-color: #000;
  }
}

/* Reduced motion support for accessibility */
@media (prefers-reduced-motion: reduce) {
  .ogp-image-container,
  .ogp-image,
  .spinner-icon {
    transition: none;
    animation: none;
  }
  
  .ogp-image-container:hover {
    transform: none;
  }
  
  .ogp-content:hover .ogp-image {
    transform: none;
  }
}

.ogp-favicon {
  display: inline-block;
  vertical-align: middle;
  margin-right: 2px;
}
</style>
