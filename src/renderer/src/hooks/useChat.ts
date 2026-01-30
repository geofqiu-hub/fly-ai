import { useState, useCallback, useEffect, useRef } from 'react'
import type { Message, Agent, Model } from '../types/chat'
import { DEFAULT_SYSTEM_PROMPT } from '../constants/prompts'

export interface UseChatProps {
  currentSessionId: string | null
  currentSessionAgent: Agent | null
  currentModel: Model | null
  createNewSession: () => Promise<string>
  autoRenameSession?: (id: string, message: string, providerId: string, config: any) => Promise<void>
}

export const useChat = ({
  currentSessionId,
  currentSessionAgent,
  currentModel,
  createNewSession,
  autoRenameSession
}: UseChatProps) => {
  const [messages, setMessages] = useState<Message[]>([])
  const [streamingContent, setStreamingContent] = useState('')
  const [streamingThought, setStreamingThought] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [activeTool, setActiveTool] = useState<{ name: string; args: any } | null>(null)
  const [toolCallLog, setToolCallLog] = useState<Array<{
    id: string
    name: string
    args: Record<string, unknown>
    output?: unknown
    isError?: boolean
    status: 'running' | 'done'
  }>>([])
  const [error, setError] = useState<string | null>(null)
  const [streamingImagePending, setStreamingImagePending] = useState(false)

  const [lastInput, setLastInput] = useState<{ text: string, attachments: any[] } | null>(null)
  const lastSessionIdRef = useRef<string | null>(null)
  const toolCallLogRef = useRef<typeof toolCallLog>([])
  const streamingThoughtRef = useRef('')

  const parseMessages = (msgs: any[]): Message[] => {
    return msgs.map((m: any) => ({
      ...m,
      attachments: m.attachments ? (typeof m.attachments === 'string' ? JSON.parse(m.attachments) : m.attachments) : undefined,
      parts: m.parts ? (typeof m.parts === 'string' ? JSON.parse(m.parts) : m.parts) : undefined
    }))
  }

  const loadMessages = useCallback(async (sessionId: string) => {
    const msgs = await window.api.getMessages(sessionId)
    setMessages(parseMessages(msgs))
  }, [])

  const handleSend = useCallback(async (text: string, attachments: any[] = []) => {
    setError(null)
    setLastInput({ text, attachments })
    
    let sessionId = currentSessionId
    const isNewSession = !currentSessionId
    
    if (isNewSession) {
      sessionId = await createNewSession()
    }
    
    if (!sessionId) {
      console.error('[useChat] Failed to get or create session')
      return
    }

    if (error && sessionId) {
      await window.api.deleteLastMessage(sessionId)
    }

    const apiConfig = await window.api.getApiConfig('gemini')
    const apiKey = apiConfig?.api_key
    const baseUrl = apiConfig?.base_url

    if (!apiKey) {
      alert('Please configure your Gemini API Key in settings')
      return
    }

    // 使用当前选择的模型，智能体不绑定模型
    const modelId = currentModel?.modelId || 'gemini-3-flash-preview'
    const providerId = currentModel?.provider || 'gemini'

    if (messages.length === 0 && autoRenameSession && sessionId) {
      autoRenameSession(sessionId, text || 'New Image Chat', providerId, { apiKey, baseUrl, modelId })
    }

      await window.api.saveMessage({
        sessionId,
        role: 'user',
        content: text,
        type: attachments.length > 0 ? 'multimodal' : 'text',
        attachments: attachments.length > 0 ? attachments : undefined,
        modelId,
        agentId: currentSessionAgent?.id
      })

    await loadMessages(sessionId)

    setIsStreaming(true)
    setStreamingContent('')
    setStreamingThought('')
    streamingThoughtRef.current = ''
    setActiveTool(null)
    setToolCallLog([])

    const currentMsgs = await window.api.getMessages(sessionId)
    const messagesHistory = parseMessages(currentMsgs)

    const systemPrompt = currentSessionAgent?.system_prompt 
      ? `${currentSessionAgent.system_prompt}\n\nPlease output in standard Markdown format.`
      : DEFAULT_SYSTEM_PROMPT

    try {
      const result = await window.api.startStream({
        sessionId,
        providerId: 'gemini',
        modelId,
        messages: messagesHistory,
        systemPrompt,
        temperature: currentSessionAgent?.temperature,
        apiKey,
        baseUrl
      })
    } catch (err: any) {
      console.error('[useChat] Stream start error:', err)
      setError(err.message || 'Failed to start stream')
      setIsStreaming(false)
    }
  }, [currentSessionId, currentSessionAgent, currentModel, messages, createNewSession, loadMessages, autoRenameSession])

  useEffect(() => {
    const lastSessionId = lastSessionIdRef.current

    // 当用户切换会话（包括点击“新建对话”创建新会话）时：
    // 1. 终止上一个会话正在进行的流式请求（如果有）
    // 2. 清空流式相关的 UI 状态，避免在新会话里看到旧会话的「思考中」内容，也避免禁用发送按钮
    if (lastSessionId && lastSessionId !== currentSessionId) {
      try {
        window.api.stopStream(lastSessionId)
      } catch (e) {
        console.warn('[useChat] Failed to stop previous stream', e)
      }

      setStreamingContent('')
      setStreamingThought('')
      setStreamingImagePending(false)
      setIsStreaming(false)
      setActiveTool(null)
      setError(null)
    }

    lastSessionIdRef.current = currentSessionId

    if (currentSessionId) {
      setMessages([]) // Clear messages when session changes to avoid flashing old content
      loadMessages(currentSessionId)
    } else {
      setMessages([])
    }
  }, [currentSessionId, loadMessages])

  useEffect(() => {
    const handleChunk = ({ sessionId, chunk }: any) => {
      if (sessionId === currentSessionId) {
        setStreamingContent(prev => prev + chunk)
      }
    }

    const handleEvent = ({ sessionId, event }: any) => {
      if (sessionId !== currentSessionId) return

      if (event.type === 'start') {
        setStreamingImagePending(event.data?.isImageModel === true)
      } else if (event.type === 'file-delta') {
        setStreamingImagePending(false)
      } else if (event.type === 'finish') {
        setStreamingImagePending(false)
        const modelId = currentModel?.modelId || 'gemini-3-flash-preview'
        const sid = currentSessionId || 'default'
        const logToSave = toolCallLogRef.current
        const parts =
          logToSave.length > 0
            ? logToSave.map((entry) => ({
                type: 'tool-call' as const,
                toolName: entry.name,
                toolInput: entry.args,
                toolOutput: entry.output,
                metadata: { isError: entry.isError }
              }))
            : undefined

        const thoughtToSave = streamingThoughtRef.current.trim() || undefined
        window.api.saveMessage({
          sessionId: sid,
          role: 'assistant',
          content: event.data.content,
          thought: thoughtToSave,
          type: 'text',
          modelId,
          parts
        })
          .then(() => {
            if (currentSessionId) {
              return window.api.getMessages(currentSessionId)
            }
            return []
          })
          .then(msgs => {
            setMessages(parseMessages(msgs))
          })
          .finally(() => {
            setStreamingContent('')
            setStreamingThought('')
            setStreamingImagePending(false)
            streamingThoughtRef.current = ''
            setIsStreaming(false)
            setActiveTool(null)
            setToolCallLog([])
          })
      } else if (event.type === 'thought-delta') {
        const delta = event.data ?? ''
        setStreamingThought((prev) => {
          const next = prev + delta
          streamingThoughtRef.current = next
          return next
        })
      } else if (event.type === 'tool-call') {
        const { name, args } = event.data
        setActiveTool({ name, args })
        setToolCallLog((prev) => {
          const next = [
            ...prev,
            { id: `tool-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`, name, args: args || {}, status: 'running' as const }
          ]
          toolCallLogRef.current = next
          return next
        })
      } else if (event.type === 'tool-result') {
        setActiveTool(null)
        setToolCallLog((prev) => {
          const next = [...prev]
          for (let i = next.length - 1; i >= 0; i--) {
            if (next[i].status === 'running') {
              next[i] = {
                ...next[i],
                output: event.data?.output,
                isError: event.data?.isError,
                status: 'done'
              }
              break
            }
          }
          toolCallLogRef.current = next
          return next
        })
      } else if (event.type === 'error') {
        console.error('[useChat] Stream error event:', event.data)
        setStreamingImagePending(false)
        setIsStreaming(false)
        setError(typeof event.data === 'string' ? event.data : (event.data?.message ?? event.data ?? 'Unknown stream error'))
      }
    }

    const handleError = ({ sessionId, error: err }: any) => {
      console.error('[useChat] handleError', { sessionId, error: err })
      if (sessionId === currentSessionId) {
        setStreamingImagePending(false)
        setIsStreaming(false)
        setError(typeof err === 'string' ? err : (err?.message || 'Unknown error occurred'))
      }
    }

    window.api.onStreamChunk(handleChunk)
    window.api.onStreamEvent(handleEvent)
    window.api.onStreamError(handleError)

    return () => {
      window.api.removeStreamListeners()
    }
  }, [currentSessionId, currentModel])

  const setMessagesList = useCallback((msgs: Message[]) => {
    setMessages(msgs)
  }, [])

  const clearMessages = useCallback(() => {
    setMessages([])
  }, [])

  const retry = useCallback(async () => {
    if (currentSessionId) {
      // 重新开始流式传输，不保存新消息，因为最后一条已经是那个失败的 user 消息了
      setError(null)
      setIsStreaming(true)
      setStreamingContent('')

      const apiConfig = await window.api.getApiConfig('gemini')
      const apiKey = apiConfig?.api_key
      const baseUrl = apiConfig?.base_url
      if (!apiKey) {
        setError('Please configure your Gemini API Key in settings')
        setIsStreaming(false)
        return
      }

      // 使用当前选择的模型，智能体不绑定模型
      const modelId = currentModel?.modelId || 'gemini-3-flash-preview'
      
      // 获取当前所有消息作为上下文
      const msgs = await window.api.getMessages(currentSessionId)
      const messagesHistory = parseMessages(msgs)

      const systemPrompt = currentSessionAgent?.system_prompt 
        ? `${currentSessionAgent.system_prompt}\n\nPlease output in standard Markdown format.`
        : DEFAULT_SYSTEM_PROMPT

      try {
        await window.api.startStream({
          sessionId: currentSessionId,
          providerId: 'gemini',
          modelId,
          messages: messagesHistory,
          systemPrompt,
          temperature: currentSessionAgent?.temperature,
          apiKey,
          baseUrl
        })
      } catch (err: any) {
        setError(err.message || 'Failed to start stream')
        setIsStreaming(false)
      }
    }
  }, [currentSessionId, currentSessionAgent, currentModel])

  return {
    messages,
    streamingContent,
    streamingThought,
    isStreaming,
    streamingImagePending,
    activeTool,
    toolCallLog,
    error,
    handleSend,
    retry,
    setMessages: setMessagesList,
    clearMessages
  }
}
