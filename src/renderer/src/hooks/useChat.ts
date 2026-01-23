import { useState, useCallback, useEffect } from 'react'
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
  const [error, setError] = useState<string | null>(null)

  const [lastInput, setLastInput] = useState<{ text: string, attachments: any[] } | null>(null)

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
    console.log('[useChat] handleSend called', { text, attachmentsCount: attachments.length, currentSessionId, currentSessionAgent, currentModel })
    setError(null)
    setLastInput({ text, attachments })
    
    let sessionId = currentSessionId
    const isNewSession = !currentSessionId
    
    if (isNewSession) {
      console.log('[useChat] No current session, creating new one')
      sessionId = await createNewSession()
      console.log('[useChat] New session created:', sessionId)
    }
    
    if (!sessionId) {
      console.error('[useChat] Failed to get or create session')
      return
    }

    // 如果当前有错误，说明上次发送失败了
    // 如果用户发送了新内容，我们应该先清理掉上次那个没有得到回复的错误消息
    if (error && sessionId) {
      console.log('[useChat] Cleaning up last failed message before sending new one')
      await window.api.deleteLastMessage(sessionId)
    }

    const apiConfig = await window.api.getApiConfig('gemini')
    const apiKey = apiConfig?.api_key
    const baseUrl = apiConfig?.base_url

    if (!apiKey) {
      alert('Please configure your Gemini API Key in settings')
      return
    }

    const modelId = currentModel?.modelId || 'gemini-1.5-flash-002'
    const providerId = currentModel?.provider || 'gemini'

    if (isNewSession && autoRenameSession) {
      autoRenameSession(sessionId, text || 'New Image Chat', providerId, { apiKey, baseUrl, modelId })
    }

    console.log('[useChat] Saving user message...')
      await window.api.saveMessage({
        sessionId,
        role: 'user',
        content: text,
        type: attachments.length > 0 ? 'multimodal' : 'text',
        attachments: attachments.length > 0 ? attachments : undefined,
        modelId,
        agentId: currentSessionAgent?.id
      })

    console.log('[useChat] Loading messages after save...')
    await loadMessages(sessionId)

    setIsStreaming(true)
    setStreamingContent('')
    setStreamingThought('')
    setActiveTool(null)

    const currentMsgs = await window.api.getMessages(sessionId)
    const messagesHistory = parseMessages(currentMsgs)

    console.log('[useChat] Starting stream...', { sessionId, messagesCount: messagesHistory.length })
    
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
      console.log('[useChat] Stream started successfully, result:', result)
    } catch (err: any) {
      console.error('[useChat] Stream start error:', err)
      setError(err.message || 'Failed to start stream')
      setIsStreaming(false)
    }
  }, [currentSessionId, currentSessionAgent, currentModel, messages, createNewSession, loadMessages, autoRenameSession])

  useEffect(() => {
    if (currentSessionId) {
      loadMessages(currentSessionId)
    }
  }, [currentSessionId, loadMessages])

  useEffect(() => {
    const handleChunk = ({ sessionId, chunk }: any) => {
      if (sessionId === currentSessionId) {
        setStreamingContent(prev => prev + chunk)
      }
    }

    const handleEvent = ({ sessionId, event }: any) => {
      console.log('[useChat] handleEvent', { sessionId, eventType: event.type })
      if (sessionId !== currentSessionId) return

      if (event.type === 'finish') {
        const modelId = currentModel?.modelId || 'gemini-1.5-flash'
        const sid = currentSessionId || 'default'
        
        window.api.saveMessage({
          sessionId: sid,
          role: 'assistant',
          content: event.data.content,
          thought: streamingThought || undefined,
          type: 'text',
          modelId
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
            setIsStreaming(false)
            setActiveTool(null)
          })
      } else if (event.type === 'thought-delta') {
        setStreamingThought(prev => prev + event.data)
      } else if (event.type === 'tool-call') {
        setActiveTool({ name: event.data.name, args: event.data.args })
      } else if (event.type === 'tool-result') {
        setActiveTool(null)
      } else if (event.type === 'error') {
        console.error('[useChat] Stream error event:', event.data)
        setIsStreaming(false)
        setError(event.data || 'Unknown stream error')
      }
    }

    const handleError = ({ sessionId, error }: any) => {
      console.error('[useChat] handleError', { sessionId, error })
      if (sessionId === currentSessionId) {
        setIsStreaming(false)
        setError(typeof error === 'string' ? error : (error.message || 'Unknown error occurred'))
      }
    }

    window.api.onStreamChunk(handleChunk)
    window.api.onStreamEvent(handleEvent)
    window.api.onStreamError(handleError)

    return () => {
      console.log('[useChat] Cleaning up stream listeners')
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

      const modelId = currentModel?.modelId || 'gemini-1.5-flash-002'
      
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
    activeTool,
    error,
    handleSend,
    retry,
    setMessages: setMessagesList,
    clearMessages
  }
}
