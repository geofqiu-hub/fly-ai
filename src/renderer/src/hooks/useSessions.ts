import { useState, useCallback, useEffect } from 'react'
import type { Agent } from '../types/chat'

export interface Session {
  id: string
  title: string
  created_at: number
}

export interface SessionState {
  currentSessionId: string | null
  currentSessionTitle: string
  currentSessionAgent: Agent | null
  refreshSidebar: number
  sessions: Session[]
}

export const useSessions = () => {
  const [state, setState] = useState<SessionState>({
    currentSessionId: null,
    currentSessionTitle: 'New Chat',
    currentSessionAgent: null,
    refreshSidebar: 0,
    sessions: []
  })

  const loadSessions = useCallback(async () => {
    const sessions = await window.api.getSessions()
    setState(prev => ({ ...prev, sessions }))
  }, [])

  const createNewSession = useCallback(async () => {
    const sessionId = await window.api.createSession('New Chat')
    setState(prev => ({
      ...prev,
      currentSessionId: sessionId,
      currentSessionTitle: 'New Chat',
      refreshSidebar: prev.refreshSidebar + 1
    }))
    // 如果用户在“未创建会话”前就选择了智能体，这里在会话创建后立刻落库
    if (state.currentSessionAgent?.id) {
      await window.api.updateSessionAgent({ sessionId, agentId: state.currentSessionAgent.id })
    }
    await loadSessions()
    return sessionId
  }, [loadSessions, state.currentSessionAgent])

  const selectSession = useCallback(async (id: string) => {
    const sessions = await window.api.getSessions()
    const session = sessions.find((s: any) => s.id === id)
    
    let agent = null
    if (session?.agent_id) {
      agent = await window.api.getAgent(session.agent_id)
    }

    setState(prev => ({
      ...prev,
      currentSessionId: id,
      currentSessionTitle: session?.title || 'New Chat',
      currentSessionAgent: agent
    }))
  }, [])

  const deleteSession = useCallback(async (id: string) => {
    await window.api.deleteSession(id)
    if (state.currentSessionId === id) {
      setState(prev => ({
        ...prev,
        currentSessionId: null,
        currentSessionTitle: 'New Chat'
      }))
    }
    await loadSessions()
  }, [state.currentSessionId, loadSessions])

  const updateSessionTitle = useCallback(async (id: string, title: string) => {
    await window.api.updateSessionTitle({ sessionId: id, title })
    setState(prev => {
      if (prev.currentSessionId === id) {
        return { ...prev, currentSessionTitle: title }
      }
      return prev
    })
    await loadSessions()
  }, [loadSessions])

  const autoRenameSession = useCallback(async (id: string, message: string, providerId: string, config: any) => {
    try {
      const title = await window.api.generateTitle({ providerId, config, message })
      if (title && title !== 'New Chat') {
        await updateSessionTitle(id, title)
      }
    } catch (error) {
      console.error('Failed to auto rename session:', error)
    }
  }, [updateSessionTitle])

  const loadSession = useCallback(async (id: string) => {
    const messages = await window.api.getMessages(id)
    const sessions = await window.api.getSessions()
    const session = sessions.find((s: any) => s.id === id)
    let agent = null
    if (session?.agent_id) {
      agent = await window.api.getAgent(session.agent_id)
    }
    return {
      messages,
      agent
    }
  }, [])

  const updateSessionAgent = useCallback(async (agentId: string | null) => {
    // 每次用户选择智能体时，记录到全局设置，供下次 # 唤出时默认高亮
    if (agentId) {
      try {
        await window.api.saveSetting('last_used_agent', agentId)
      } catch (error) {
        console.warn('Failed to save last_used_agent setting:', error)
      }
    }

    // 允许在 session 尚未创建时选择智能体：先更新内存态，等创建 session 后再落库
    if (!state.currentSessionId) {
      if (agentId) {
        const agent = await window.api.getAgent(agentId)
        setState(prev => ({ ...prev, currentSessionAgent: agent }))
      } else {
        setState(prev => ({ ...prev, currentSessionAgent: null }))
      }
      return 'session-id'
    }

    await window.api.updateSessionAgent({ sessionId: state.currentSessionId, agentId: agentId || undefined })
    if (agentId) {
      const agent = await window.api.getAgent(agentId)
      setState(prev => ({ ...prev, currentSessionAgent: agent }))
    } else {
      // 清空当前会话智能体（用于恢复默认系统提示词）
      setState(prev => ({ ...prev, currentSessionAgent: null }))
    }

    return state.currentSessionId
  }, [state.currentSessionId])

  const clearSession = useCallback(() => {
    setState({
      ...state,
      currentSessionId: null,
      currentSessionTitle: 'New Chat',
      currentSessionAgent: null
    })
  }, [state])

  const setSessionId = useCallback((sessionId: string | null) => {
    setState({ ...state, currentSessionId: sessionId })
  }, [state])

  useEffect(() => {
    loadSessions()
  }, [loadSessions])

  return {
    ...state,
    createNewSession,
    loadSession,
    selectSession,
    deleteSession,
    updateSessionTitle,
    autoRenameSession,
    updateSessionAgent,
    clearSession,
    setSessionId
  }
}
