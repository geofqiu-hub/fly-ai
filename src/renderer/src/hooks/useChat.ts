import { useState, useCallback } from 'react'
import type { Message, Agent } from '../types/chat'

export interface UseChatProps {
  currentSessionId: string | null
  currentSessionAgent: Agent | null
  createNewSession: () => Promise<string>
}

export const useChat = ({
  currentSessionId,
  currentSessionAgent,
  createNewSession
}: UseChatProps) => {
  // UI 状态
  const [messages, setMessages] = useState<Message[]>([])
  const [streamingContent, setStreamingContent] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)

  /**
   * 发送消息
   */
  const handleSend = useCallback(async (text: string, attachments: any[] = [], modelId?: string) => {
    // TODO: 实现发送消息的业务逻辑
  }, [
    currentSessionId,
    currentSessionAgent,
    messages,
    createNewSession
  ])

  /**
   * 设置消息列表
   */
  const setMessagesList = useCallback((msgs: Message[]) => {
    setMessages(msgs)
  }, [])

  /**
   * 清空消息列表
   */
  const clearMessages = useCallback(() => {
    setMessages([])
  }, [])

  return {
    messages,
    streamingContent,
    isStreaming,
    handleSend,
    setMessages: setMessagesList,
    clearMessages
  }
}
