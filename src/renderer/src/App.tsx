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

  // ========== 会话管理 ==========
  const sessions = useSessions()

  // ========== 聊天逻辑 ==========
  const chat = useChat({
    currentSessionId: sessions.currentSessionId,
    currentSessionAgent: sessions.currentSessionAgent,
    createNewSession: sessions.createNewSession
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

  // ========== 初始化 ==========
  const initApp = async () => {
    const sessionsCount = (await window.api.getSessions()).length
    console.log('🚀 App initialized -', sessionsCount, 'sessions found')
  }

  // ========== 事件处理 ==========
  const handleLoadSession = async (id: string) => {
    const { messages } = await sessions.loadSession(id)
    chat.setMessages(messages)
  }

  const handleNewSession = async () => {
    await sessions.createNewSession()
    chat.clearMessages()
  }

  return (
    <div className="flex h-screen w-full bg-claude-bg text-gray-800 font-sans selection:bg-claude-accent selection:text-white">
      <Sidebar
        onOpenSettings={() => setIsSettingsOpen(true)}
        onSelectSession={handleLoadSession}
        currentSessionId={sessions.currentSessionId}
        onNewSession={handleNewSession}
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
          isStreaming={chat.isStreaming}
        />
        <InputArea
          onSend={chat.handleSend}
          disabled={chat.isStreaming}
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
