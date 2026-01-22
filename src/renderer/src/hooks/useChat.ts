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
  const [isStreaming, setIsStreaming] = useState(false)
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
            setIsStreaming(false)
          })
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
    }
  }, [currentSessionId, currentModel])

  const setMessagesList = useCallback((msgs: Message[]) => {
    setMessages(msgs)
  }, [])

  const clearMessages = useCallback(() => {
    setMessages([])
  }, [])

  const retry = useCallback(async () => {
    if (lastInput && currentSessionId) {
      // For retry, we don't want to save the user message again because it's already there
      // We just want to restart the stream for the current session
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
      
      const msgs = await window.api.getMessages(currentSessionId)
      const parsedMsgs = parseMessages(msgs)
      const messagesHistory = parsedMsgs.slice(0, -1)
      const lastUserMsg = parsedMsgs[parsedMsgs.length - 1]

      const systemPrompt = currentSessionAgent?.system_prompt 
        ? `${currentSessionAgent.system_prompt}\n\nPlease output in standard Markdown format.`
        : DEFAULT_SYSTEM_PROMPT

      try {
        await window.api.startStream({
          sessionId: currentSessionId,
          providerId: 'gemini',
          modelId,
          messages: [...messagesHistory, lastUserMsg],
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
  }, [lastInput, currentSessionId, currentSessionAgent, currentModel])

  return {
    messages,
    streamingContent,
    isStreaming,
    error,
    handleSend,
    retry,
    setMessages: setMessagesList,
    clearMessages
  }
}
