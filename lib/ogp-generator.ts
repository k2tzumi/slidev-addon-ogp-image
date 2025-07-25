import { createCanvas, registerFont, loadImage } from 'canvas'
let fs: typeof import('fs') | undefined
if (typeof process !== 'undefined' && process.versions?.node) {
  fs = require('fs')
}

export interface OgpData {
  title: string
  description?: string
  image?: string
  url: string
  siteName?: string
}

export interface OgpImageOptions {
  width?: number
  height?: number
  templatePath?: string
  fontPath?: string
  fontSize?: number
  fontFamily?: string
  textColor?: string
  maxWidth?: number
}

const defaultOptions: Required<OgpImageOptions> = {
  width: 1200,
  height: 630,
  templatePath: './assets/ogp-template.svg',
  fontPath: './assets/NotoSansJP-Bold.otf',
  fontSize: 48,
  fontFamily: 'NotoSansJP',
  textColor: '#FFFFFF',
  maxWidth: 800
}

/**
 * Fetch OGP data from URL
 */
export async function fetchOgpData(url: string): Promise<OgpData> {
  try {
    const response = await fetch(url)
    const html = await response.text()
    
    const ogpData: OgpData = {
      url,
      title: ''
    }
    
    // Extract OGP meta tags
    const ogTitleMatch = html.match(/<meta property="og:title" content="([^"]*)"/)
    const ogDescriptionMatch = html.match(/<meta property="og:description" content="([^"]*)"/)
    const ogImageMatch = html.match(/<meta property="og:image" content="([^"]*)"/)
    const ogSiteNameMatch = html.match(/<meta property="og:site_name" content="([^"]*)"/)
    
    // Fallback to title tag
    const titleMatch = html.match(/<title>([^<]*)<\/title>/)
    
    ogpData.title = ogTitleMatch?.[1] || titleMatch?.[1] || 'No Title'
    ogpData.description = ogDescriptionMatch?.[1]
    ogpData.image = ogImageMatch?.[1]
    ogpData.siteName = ogSiteNameMatch?.[1]
    
    return ogpData
  } catch (error) {
    console.error('Failed to fetch OGP data:', error)
    return {
      url,
      title: 'Failed to load'
    }
  }
}

/**
 * Generate OGP image using canvas
 */
export async function generateOgImage(
  ogpData: OgpData, 
  options: Partial<OgpImageOptions> = {}
): Promise<Buffer> {
  const opts = { ...defaultOptions, ...options }
  
  // Register font if available (Node.js environment only)
  if (fs && fs.existsSync(opts.fontPath)) {
    registerFont(opts.fontPath, { family: opts.fontFamily })
  }
  
  // Create canvas
  const canvas = createCanvas(opts.width, opts.height)
  const ctx = canvas.getContext('2d')
  
  // Load background template image (Node.js environment only)
  if (fs && fs.existsSync(opts.templatePath)) {
    try {
      const templateImage = await loadImage(fs.readFileSync(opts.templatePath))
      ctx.drawImage(templateImage, 0, 0, opts.width, opts.height)
    } catch (error) {
      console.warn('Failed to load template image, using default background:', error)
      createDefaultBackground(ctx, opts.width, opts.height)
    }
  } else {
    createDefaultBackground(ctx, opts.width, opts.height)
  }
  
  // Set text style with shadow for better visibility
  ctx.fillStyle = opts.textColor
  ctx.font = `${opts.fontSize}px "${opts.fontFamily}"`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  
  // Add text shadow for better readability
  ctx.shadowColor = 'rgba(0, 0, 0, 0.3)'
  ctx.shadowOffsetX = 2
  ctx.shadowOffsetY = 2
  ctx.shadowBlur = 4
  
  // Draw title with automatic line wrapping
  const lines = wrapText(ctx, ogpData.title, opts.maxWidth)
  const lineHeight = opts.fontSize * 1.2
  const totalHeight = lines.length * lineHeight
  const startY = (opts.height - totalHeight) / 2 + lineHeight / 2
  
  lines.forEach((line, index) => {
    const y = startY + index * lineHeight
    ctx.fillText(line, opts.width / 2, y)
  })
  
  // Draw site name at the bottom
  if (ogpData.siteName) {
    ctx.font = `${opts.fontSize * 0.6}px "${opts.fontFamily}"`
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'
    ctx.fillText(ogpData.siteName, opts.width / 2, opts.height - 60)
  }
  
  return canvas.toBuffer('image/png')
}

/**
 * Create default gradient background
 */
function createDefaultBackground(ctx: any, width: number, height: number) {
  const gradient = ctx.createLinearGradient(0, 0, width, height)
  gradient.addColorStop(0, '#667eea')
  gradient.addColorStop(0.5, '#764ba2') 
  gradient.addColorStop(1, '#f093fb')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, width, height)
}

/**
 * Wrap text to fit within specified width
 */
function wrapText(ctx: any, text: string, maxWidth: number): string[] {
  const words = text.split(' ')
  const lines: string[] = []
  let currentLine = words[0]
  
  for (let i = 1; i < words.length; i++) {
    const word = words[i]
    const width = ctx.measureText(currentLine + ' ' + word).width
    
    if (width < maxWidth) {
      currentLine += ' ' + word
    } else {
      lines.push(currentLine)
      currentLine = word
    }
  }
  lines.push(currentLine)
  
  // Limit to maximum 3 lines
  return lines.slice(0, 3)
}
