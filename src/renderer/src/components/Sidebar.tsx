import React from 'react'
import { Settings, Plus, MessageSquare, Trash2, Menu } from 'lucide-react'
import clsx from 'clsx'
import type { Session } from '../hooks/useSessions'

interface Props {
  onOpenSettings: () => void
  onSelectSession: (id: string) => void
  onDeleteSession: (id: string) => void
  currentSessionId: string | null
  onNewSession: () => void
  sessions: Session[]
  isCollapsed?: boolean
  onToggleCollapse?: () => void
}

export function Sidebar({ onOpenSettings, onSelectSession, onDeleteSession, currentSessionId, onNewSession, sessions, isCollapsed = false, onToggleCollapse }: Props) {
  return (
    <div className={clsx(
      "bg-claude-bg flex flex-col h-full transition-all duration-300 ease-in-out",
      isCollapsed ? "w-16" : "w-64"
    )}>
      {/* Drag region for window moving */}
      <div className={clsx(
        "flex items-center shrink-0 drag-region",
        isCollapsed ? "pt-20 pb-4 justify-center" : "pt-14 px-4 pb-4 justify-between"
      )}>
          {!isCollapsed && (
            <span className="font-serif font-semibold text-xl tracking-tight text-gray-800 select-none no-drag">FlyAi</span>
          )}
          <div className={clsx(
            "flex items-center gap-1 no-drag",
            isCollapsed ? "flex-col gap-2" : ""
          )}>
            {!isCollapsed && (
              <button
                onClick={onNewSession}
                className="p-2 hover:bg-black/5 rounded-lg text-gray-600 transition-all hover:scale-105 active:scale-95"
                title="新建对话"
              >
                <Plus size={18} />
              </button>
            )}
            <button
              onClick={onToggleCollapse}
              className={clsx(
                "hover:bg-black/5 rounded-lg text-gray-600 transition-all hover:scale-105 active:scale-95",
                isCollapsed ? "p-2.5" : "p-2"
              )}
              title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            >
              <Menu size={18} />
            </button>
          </div>
      </div>

      {!isCollapsed && (
        <>
          <div className="flex-1 overflow-y-auto px-2 py-2">
              <div className="text-xs font-medium text-gray-500 mb-2 px-2 uppercase tracking-wider">
                对话历史
              </div>
              {sessions.map(session => (
                <div
                    key={session.id}
                    onClick={() => onSelectSession(session.id)}
                    className={clsx(
                      "group w-full text-left px-3 py-2 rounded-md text-sm mb-1 truncate flex items-center justify-between cursor-pointer transition-colors",
                      currentSessionId === session.id
                        ? "bg-white shadow-sm text-gray-900 font-medium"
                        : "text-gray-600 hover:bg-black/5"
                    )}
                >
                   <div className="flex items-center gap-2 truncate flex-1">
                      <MessageSquare size={14} className="opacity-50 shrink-0" />
                      <span className="truncate">{session.title || 'New Chat'}</span>
                   </div>
                   <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onDeleteSession(session.id)
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-black/10 rounded text-gray-400 hover:text-red-500 transition-all"
                  >
                       <Trash2 size={12} />
                   </button>
                </div>
              ))}
          </div>

          <div className="p-2 border-t border-black/5">
              <button
                onClick={onOpenSettings}
                className="flex items-center gap-2 w-full px-3 py-2 hover:bg-black/5 rounded-md text-sm text-gray-700 transition-colors"
              >
                  <Settings size={16} />
                  <span>Settings</span>
              </button>
          </div>
        </>
      )}

      {isCollapsed && (
        <div className="flex-1 flex flex-col items-center py-6 gap-3 px-1">
          <button onClick={onNewSession} className="p-2.5 hover:bg-black/5 rounded-xl text-gray-600 transition-all hover:scale-105 active:scale-95 shadow-sm hover:shadow-md" title="新建对话">
            <Plus size={20} />
          </button>
          <button
            onClick={onOpenSettings}
            className="p-2.5 hover:bg-black/5 rounded-xl text-gray-600 transition-all hover:scale-105 active:scale-95 shadow-sm hover:shadow-md"
            title="Settings"
          >
            <Settings size={20} />
          </button>
        </div>
      )}
    </div>
  )
 }

