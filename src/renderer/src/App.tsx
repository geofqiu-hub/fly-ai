import React, { useEffect, useState } from 'react'
import { Sidebar } from './components/Sidebar'
import { ChatArea } from './components/ChatArea'
import { ChatHeader } from './components/ChatHeader'
import { InputArea } from './components/InputArea'
import { SettingsModal } from './components/SettingsModal'
import { useSessions } from './hooks/useSessions'
import { useChat } from './hooks/useChat'

function App() {
  // ========== UI 状态 ==========
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [currentModel, setCurrentModel] = useState<any>(null)

  // ========== 会话管理 ==========
  const sessions = useSessions()

  // ========== 聊天逻辑 ==========
  const chat = useChat({
    currentSessionId: sessions.currentSessionId,
    currentSessionAgent: sessions.currentSessionAgent,
    currentModel,
    createNewSession: sessions.createNewSession,
    autoRenameSession: sessions.autoRenameSession
  })

  // ========== 副作用 ==========
  useEffect(() => { initApp() }, [])

  // 响应式侧边栏
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setIsSidebarCollapsed(true)
      }
    }

    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // 切换会话时处理模型/智能体状态
  useEffect(() => {
    if (sessions.currentSessionAgent) {
      setCurrentModel(null)
    }
  }, [sessions.currentSessionAgent])

  // ========== 初始化 ==========
  const initApp = async () => {
    const sessionsCount = (await window.api.getSessions()).length
    console.log('🚀 App initialized -', sessionsCount, 'sessions found')

    // Load last used model
    const lastModelId = await window.api.getSetting('last_used_model')
    const models = await window.api.getModels()
    
    if (lastModelId) {
      const model = models.find((m: any) => m.modelId === lastModelId)
      if (model) {
        setCurrentModel(model)
      } else {
        // Fallback if model no longer exists
        const defaultModel = models.find((m: any) => m.modelId === 'gemini-2.5-flash') || models[0]
        setCurrentModel(defaultModel)
      }
    } else {
      const defaultModel = models.find((m: any) => m.modelId === 'gemini-2.5-flash') || models[0]
      setCurrentModel(defaultModel)
    }
  }

  // ========== 事件处理 ==========
  const handleLoadSession = async (id: string) => {
    await sessions.selectSession(id)
    // chat hook will automatically load messages via useEffect when currentSessionId changes
  }

  const handleNewSession = async () => {
    await sessions.createNewSession()
    chat.clearMessages()
    
    // Default to last used model for new sessions
    const lastModelId = await window.api.getSetting('last_used_model')
    const models = await window.api.getModels()
    const defaultModelId = lastModelId || 'gemini-2.5-flash'
    const model = models.find((m: any) => m.modelId === defaultModelId) || models[0]
    setCurrentModel(model)
  }

  const handleSelectModel = async (model: any) => {
    setCurrentModel(model)
    if (model) {
      await window.api.saveSetting('last_used_model', model.modelId)
    }
  }

  return (
    <div className="flex h-screen w-full bg-claude-bg text-gray-800 font-sans selection:bg-claude-accent selection:text-white">
      <Sidebar
        onOpenSettings={() => setIsSettingsOpen(true)}
        onSelectSession={handleLoadSession}
        onDeleteSession={sessions.deleteSession}
        onRenameSession={sessions.updateSessionTitle}
        currentSessionId={sessions.currentSessionId}
        onNewSession={handleNewSession}
        sessions={sessions.sessions}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      />
      <div className="flex-1 flex flex-col h-full relative">
        <div className="h-8 w-full shrink-0 drag-region z-50 absolute top-0 left-0" />
        <ChatHeader
          title={sessions.currentSessionTitle}
          onToggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          isSidebarCollapsed={isSidebarCollapsed}
        />
        <ChatArea
          messages={chat.messages}
          streamingContent={chat.streamingContent}
          streamingThought={chat.streamingThought}
          isStreaming={chat.isStreaming}
          activeTool={chat.activeTool}
          error={chat.error}
          onRetry={chat.retry}
        />
        <InputArea
          onSend={chat.handleSend}
          disabled={chat.isStreaming}
          currentAgent={sessions.currentSessionAgent}
          currentModel={currentModel}
          onSelectModel={handleSelectModel}
        />
      </div>
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  )
}

export default App
