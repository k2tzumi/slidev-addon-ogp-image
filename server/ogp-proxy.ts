import { lookup } from 'node:dns/promises'
import { isIP } from 'node:net'
import type { Plugin } from 'vite'

const endpoint = '/__slidev_ogp'
const maxTimeoutMs = 60_000
const maxHtmlBytes = 2 * 1024 * 1024
const maxRedirects = 5

/** Vite middleware used only by the Slidev development server. */
export function ogpProxyPlugin(): Plugin {
  return {
    name: 'slidev-addon-ogp-image:dev-proxy',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        let requestUrl: URL
        try {
          requestUrl = new URL(req.url || '/', 'http://localhost')
        } catch {
          next()
          return
        }

        if (requestUrl.pathname !== endpoint) {
          next()
          return
        }

        void handleProxyRequest(req, res, requestUrl)
      })
    }
  }
}

async function handleProxyRequest(
  req: import('node:http').IncomingMessage,
  res: import('node:http').ServerResponse,
  requestUrl: URL
): Promise<void> {
  if (req.method !== 'GET') {
    sendError(res, 405, 'Method not allowed')
    return
  }

  // Prevent other websites from using a running development server as a proxy.
  const origin = req.headers.origin
  const host = req.headers.host
  if (origin) {
    try {
      if (!host || new URL(origin).host !== host) {
        sendError(res, 403, 'Cross-origin requests are not allowed')
        return
      }
    } catch {
      sendError(res, 403, 'Invalid request origin')
      return
    }
  }

  const target = requestUrl.searchParams.get('url')
  if (!target) {
    sendError(res, 400, 'Missing url parameter')
    return
  }

  const timeoutParam = Number(requestUrl.searchParams.get('timeoutMs') || 15_000)
  if (!Number.isFinite(timeoutParam) || timeoutParam < 1) {
    sendError(res, 400, 'Invalid timeoutMs parameter')
    return
  }
  const timeoutMs = Math.min(Math.floor(timeoutParam), maxTimeoutMs)

  try {
    const html = await fetchRemoteHtml(target, timeoutMs)
    res.statusCode = 200
    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    res.setHeader('X-Slidev-Ogp-Proxy', '1')
    res.setHeader('Cache-Control', 'no-store')
    res.end(html)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Remote fetch failed'
    sendError(res, 502, message)
  }
}

async function fetchRemoteHtml(initialUrl: string, timeoutMs: number): Promise<string> {
  const deadline = Date.now() + timeoutMs
  const signal = AbortSignal.timeout(timeoutMs)
  let target = new URL(initialUrl)

  for (let redirect = 0; redirect <= maxRedirects; redirect++) {
    await assertPublicHttpUrl(target)
    if (signal.aborted || Date.now() >= deadline) {
      throw new Error('Remote fetch timed out')
    }

    const response = await fetch(target, {
      headers: {
        Accept: 'text/html,application/xhtml+xml;q=0.9',
        'User-Agent': 'slidev-addon-ogp-image/0.0.5'
      },
      redirect: 'manual',
      signal
    })

    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get('location')
      if (!location || redirect === maxRedirects) {
        throw new Error('Too many or invalid redirects')
      }
      await response.body?.cancel()
      target = new URL(location, target)
      continue
    }

    if (!response.ok) {
      throw new Error(`Remote server returned HTTP ${response.status}`)
    }

    const contentType = response.headers.get('content-type') || ''
    if (contentType && !/^(text\/html|application\/xhtml\+xml)(;|$)/i.test(contentType)) {
      throw new Error('Remote response is not HTML')
    }

    const contentLength = Number(response.headers.get('content-length'))
    if (Number.isFinite(contentLength) && contentLength > maxHtmlBytes) {
      throw new Error('Remote HTML exceeds the 2 MB limit')
    }

    return await readLimitedHtml(response)
  }

  throw new Error('Too many redirects')
}

async function assertPublicHttpUrl(url: URL): Promise<void> {
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
    throw new Error('Only public HTTP(S) URLs are allowed')
  }

  if (url.port && !['80', '443'].includes(url.port)) {
    throw new Error('Only HTTP and HTTPS ports are allowed')
  }

  const hostname = url.hostname.replace(/^\[|\]$/g, '').toLowerCase()
  if (hostname === 'localhost' || hostname.endsWith('.localhost') || hostname.endsWith('.local')) {
    throw new Error('Local network URLs are not allowed')
  }

  const ipVersion = isIP(hostname)
  const addresses = ipVersion
    ? [{ address: hostname, family: ipVersion }]
    : await lookup(hostname, { all: true, verbatim: true })

  if (addresses.length === 0 || addresses.some(({ address, family }) => !isPublicAddress(address, family))) {
    throw new Error('Local or non-public network addresses are not allowed')
  }
}

function isPublicAddress(address: string, family: number): boolean {
  if (family === 4) {
    const octets = address.split('.').map(Number)
    const [a, b] = octets
    if (octets.length !== 4 || octets.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
      return false
    }

    return !(
      a === 0 || a === 10 || a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && (b === 0 || b === 168)) ||
      (a === 198 && (b === 18 || b === 19 || b === 51)) ||
      (a === 203 && b === 0) ||
      a >= 224
    )
  }

  // Accept only IPv6 global-unicast space (2000::/3); this excludes loopback,
  // link-local, unique-local and IPv4-mapped addresses.
  const firstGroup = Number.parseInt(address.split(':')[0] || '0', 16)
  return firstGroup >= 0x2000 && firstGroup <= 0x3fff && !address.toLowerCase().startsWith('2001:db8:')
}

async function readLimitedHtml(response: Response): Promise<string> {
  if (!response.body) {
    return ''
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let totalBytes = 0
  let html = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      totalBytes += value.byteLength
      if (totalBytes > maxHtmlBytes) {
        await reader.cancel()
        throw new Error('Remote HTML exceeds the 2 MB limit')
      }
      html += decoder.decode(value, { stream: true })
    }
    return html + decoder.decode()
  } finally {
    reader.releaseLock()
  }
}

function sendError(res: import('node:http').ServerResponse, status: number, message: string): void {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')
  res.end(JSON.stringify({ error: message }))
}
