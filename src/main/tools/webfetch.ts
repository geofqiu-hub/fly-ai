import { ToolExecutor } from './base'

const MAX_BODY_LENGTH = 500 * 1024 // 500KB

/** 常见在部分网络环境（如大陆直连）下不可达的域名，用于失败时给出友好提示 */
const COMMONLY_RESTRICTED_HOSTS = [
  'google.com',
  'googleapis.com',
  'googleusercontent.com',
  'gstatic.com',
  'youtube.com',
  'googletagmanager.com',
  'google-analytics.com',
  'gmail.com',
  'blogger.com',
  'google.cn'
]

function isLikelyRestrictedInNetwork(host: string): boolean {
  const lower = host.toLowerCase().replace(/^www\./, '')
  return COMMONLY_RESTRICTED_HOSTS.some(
    (h) => lower === h || lower.endsWith('.' + h)
  )
}

export class WebfetchTool implements ToolExecutor {
  definition = {
    name: 'webfetch',
    description:
      'Fetch content from a URL and return the response body as text. Use for documentation or web pages. Does not execute JavaScript. Note: In some networks (e.g. without proxy), Google and similar sites may be unreachable.',
    parameters: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'Full URL to fetch (e.g. https://example.com/page)'
        }
      },
      required: ['url']
    }
  }

  async execute(
    args: { url: string },
    context: { sessionId: string; apiKey: string; baseUrl?: string; onEvent?: (event: any) => void }
  ): Promise<{ content?: string; error?: string }> {
    let parsed: URL
    try {
      parsed = new URL(args.url)
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        return { error: 'Only http and https URLs are allowed.' }
      }
    } catch {
      return { error: 'Invalid URL.' }
    }

    try {
      const res = await fetch(parsed.toString(), {
        headers: { 'User-Agent': 'FlyAI/1.0' },
        signal: AbortSignal.timeout(15000)
      })
      if (!res.ok) {
        return { error: `HTTP ${res.status}: ${res.statusText}` }
      }
      const text = await res.text()
      if (text.length > MAX_BODY_LENGTH) {
        return { content: text.slice(0, MAX_BODY_LENGTH) + '\n\n...(truncated)' }
      }
      return { content: text }
    } catch (e) {
      const msg = (e as Error).message
      const isNetworkFailure =
        /timeout|ETIMEDOUT|ECONNREFUSED|ENOTFOUND|network|fetch failed/i.test(msg)
      if (isNetworkFailure && isLikelyRestrictedInNetwork(parsed.hostname)) {
        return {
          error:
            `${msg} 当前网络环境可能无法直接访问 Google 等站点。可尝试使用代理/VPN，或换用国内可访问的链接。`
        }
      }
      return { error: msg }
    }
  }
}
