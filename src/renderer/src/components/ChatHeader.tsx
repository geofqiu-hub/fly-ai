import React from 'react'
import { MessageSquare, Menu } from 'lucide-react'

interface Props {
  title: string
  onToggleSidebar?: () => void
  isSidebarCollapsed?: boolean
}

export function ChatHeader({ title, onToggleSidebar, isSidebarCollapsed }: Props) {
  return (
    <div className="h-14 bg-claude-bg flex items-center gap-3 px-6 shrink-0">
      {false && isSidebarCollapsed && onToggleSidebar && (
        <button
          onClick={onToggleSidebar}
          className="p-1 hover:bg-black/5 rounded text-gray-600 transition-colors"
          title="Open Sidebar"
        >
          <Menu size={18} />
        </button>
      )}
      <MessageSquare size={16} className="text-claude-accent opacity-70" />
      <h1 className="text-sm font-medium text-gray-800 truncate">
        {title || 'New Chat'}
      </h1>
    </div>
  )
}
