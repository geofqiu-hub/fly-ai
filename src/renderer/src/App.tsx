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
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true) // 默认折叠
  const [currentModel, setCurrentModel] = useState<any>(null)
  const [modelsRefreshKey, setModelsRefreshKey] = useState(0)

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

  // 选择智能体不影响模型选择，保持用户当前选择的模型

  // 当会话切换时，同步模型选择
  useEffect(() => {
    const syncModel = async () => {
      if (!sessions.currentSessionId) return

      const msgs = await window.api.getMessages(sessions.currentSessionId)
      const models = await window.api.getModels()
      
      if (msgs && msgs.length > 0) {
        // 找到该对话中使用的模型（从消息记录中获取）
        const lastMsgWithModel = [...msgs].reverse().find((m: any) => m.model_id)
        if (lastMsgWithModel) {
          const model = models.find((m: any) => m.modelId === lastMsgWithModel.model_id)
          if (model) {
            setCurrentModel(model)
            return
          }
        }
      }

      // 如果是新对话或没找到模型记录，使用最后一次选择的模型
      const lastModelId = await window.api.getSetting('last_used_model')
      const defaultModelId = lastModelId || 'gemini-3-flash-preview'
      const model = models.find((m: any) => m.modelId === defaultModelId) || models[0]
      setCurrentModel(model)
    }

    syncModel()
  }, [sessions.currentSessionId])

  // ========== 初始化 ==========
  const initApp = async () => {

    // Load last used model
    const lastModelId = await window.api.getSetting('last_used_model')
    const models = await window.api.getModels()
    
    if (lastModelId) {
      const model = models.find((m: any) => m.modelId === lastModelId)
      if (model) {
        setCurrentModel(model)
      } else {
        // Fallback if model no longer exists
        const defaultModel = models.find((m: any) => m.modelId === 'gemini-3-flash-preview') || models[0]
        setCurrentModel(defaultModel)
      }
    } else {
      const defaultModel = models.find((m: any) => m.modelId === 'gemini-3-flash-preview') || models[0]
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
    const defaultModelId = lastModelId || 'gemini-3-flash-preview'
    const model = models.find((m: any) => m.modelId === defaultModelId) || models[0]
    setCurrentModel(model)
  }

  const handleSelectModel = async (model: any) => {
    if (chat.messages.length > 0) return
    setCurrentModel(model)
    if (model) {
      await window.api.saveSetting('last_used_model', model.modelId)
    }
  }

  const handleSelectAgent = async (agentId: string | null) => {
    await sessions.updateSessionAgent(agentId)
  }

  // 设置保存后刷新模型列表与当前选中模型，使修改的模型映射实时生效
  const handleSettingsChanged = async () => {
    setModelsRefreshKey(k => k + 1)
    const models = await window.api.getModels()
    if (!models?.length) return
    if (currentModel?.id) {
      const sameSlot = models.find((m: any) => m.id === currentModel.id)
      if (sameSlot) {
        setCurrentModel(sameSlot)
        return
      }
    }
    const lastModelId = await window.api.getSetting('last_used_model')
    const model = models.find((m: any) => m.modelId === lastModelId) || models[0]
    setCurrentModel(model)
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
          streamingImagePending={chat.streamingImagePending}
          activeTool={chat.activeTool}
          toolCallLog={chat.toolCallLog}
          error={chat.error}
          onRetry={chat.retry}
        />
        <InputArea
          onSend={chat.handleSend}
          disabled={chat.isStreaming}
          currentAgent={sessions.currentSessionAgent}
          currentModel={currentModel}
          onSelectModel={handleSelectModel}
          canChangeModel={chat.messages.length === 0}
          onSelectAgent={handleSelectAgent}
          modelsRefreshKey={modelsRefreshKey}
        />
      </div>
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSettingsChanged={handleSettingsChanged}
      />
    </div>
  )
}

export default App
