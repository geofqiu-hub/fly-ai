import { ipcMain, BrowserWindow } from 'electron'
import { StreamEvent, Provider, ChatParams } from '../providers/base'

interface StreamSession {
  sessionId: string
  abortController: AbortController
  generator: AsyncGenerator<StreamEvent>
}

class StreamManager {
  private sessions: Map<string, StreamSession> = new Map()

  async startStream(
    sessionId: string,
    provider: Provider,
    params: ChatParams,
    window: BrowserWindow
  ): Promise<void> {
    if (this.sessions.has(sessionId)) {
      this.stopStream(sessionId)
    }

    const abortController = new AbortController()
    const generator = provider.streamChat({
      ...params,
      callbacks: {
        ...params.callbacks,
        onChunk: (chunk: string) => {
          window.webContents.send('stream-chunk', { sessionId, chunk })
          params.callbacks.onChunk?.(chunk)
        }
      }
    })

    const session: StreamSession = {
      sessionId,
      abortController,
      generator
    }

    this.sessions.set(sessionId, session)

    try {
      for await (const event of generator) {
        window.webContents.send('stream-event', { sessionId, event })

        if (event.type === 'finish') {
          this.sessions.delete(sessionId)
          break
        }

        if (event.type === 'error') {
          this.sessions.delete(sessionId)
          break
        }
      }
    } catch (error) {
      console.error('[StreamManager] Error:', error)
      let message = (error as Error).message
      if (/fetch failed/i.test(message)) {
        message = `${message}（请检查网络连接或代理）`
      }
      window.webContents.send('stream-error', { sessionId, error: message })
      this.sessions.delete(sessionId)
    }
  }

  stopStream(sessionId: string): void {
    const session = this.sessions.get(sessionId)
    if (session) {
      session.abortController.abort()
      this.sessions.delete(sessionId)
    }
  }

  stopAllStreams(): void {
    for (const [sessionId, session] of this.sessions.entries()) {
      session.abortController.abort()
    }
    this.sessions.clear()
  }

  isStreaming(sessionId: string): boolean {
    return this.sessions.has(sessionId)
  }
}

export const streamManager = new StreamManager()

export function setupStreamIPC() {
  ipcMain.handle('start-stream', async (event, { sessionId, providerId, modelId, messages, systemPrompt, temperature, maxTokens, apiKey, baseUrl }) => {
    const { GeminiProvider } = await import('../providers/gemini-provider')
    const { providerManager } = await import('../providers/provider-manager')

    const provider = providerManager.getProvider(providerId, modelId)
    if (!provider) {
      console.error('[IPC] Provider not found:', providerId)
      return { success: false, error: `Provider not found: ${providerId}` }
    }

    const window = BrowserWindow.fromWebContents(event.sender)!
    try {
      await streamManager.startStream(sessionId, provider, {
        sessionId, // 传递 sessionId 以便 Provider 保存文件
        config: {
          apiKey,
          baseUrl,
          provider: providerId as 'gemini' | 'openai' | 'glm' | 'qwen',
          modelId
        },
        messages,
        systemPrompt,
        temperature,
        maxTokens,
        callbacks: {
          onChunk: () => {},
          onComplete: () => {},
          onError: () => {}
        }
      }, window)
      return { success: true }
    } catch (err) {
      console.error('[IPC] Stream start error:', err)
      return { success: false, error: (err as Error).message }
    }
  })

  ipcMain.handle('stop-stream', async (_, sessionId: string) => {
    streamManager.stopStream(sessionId)
    return { success: true }
  })

  ipcMain.handle('is-streaming', async (_, sessionId: string) => {
    return streamManager.isStreaming(sessionId)
  })
}
