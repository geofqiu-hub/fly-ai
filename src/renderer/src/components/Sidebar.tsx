import React, { useState, useEffect } from 'react'
import { Settings, Plus, MessageSquare, Trash2, Menu, Edit2, Archive, Copy } from 'lucide-react'
import clsx from 'clsx'
import type { Session } from '../hooks/useSessions'

interface Props {
  onOpenSettings: () => void
  onSelectSession: (id: string) => void
  onDeleteSession: (id: string) => void
  onRenameSession: (id: string, title: string) => void
  currentSessionId: string | null
  onNewSession: () => void
  sessions: Session[]
  isCollapsed?: boolean
  onToggleCollapse?: () => void
}

export function Sidebar({ onOpenSettings, onSelectSession, onDeleteSession, onRenameSession, currentSessionId, onNewSession, sessions, isCollapsed = false, onToggleCollapse }: Props) {
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, sessionId: string } | null>(null);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

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
            <span className="font-serif font-semibold text-xl tracking-tight text-gray-800 select-none no-drag">FlyAI</span>
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
                    onContextMenu={(e) => {
                      e.preventDefault();
                      setContextMenu({ x: e.clientX, y: e.clientY, sessionId: session.id });
                    }}
                    className={clsx(
                      "group w-full text-left px-3 py-2 rounded-md text-sm mb-1 truncate flex items-center justify-between cursor-pointer transition-colors",
                      currentSessionId === session.id
                        ? "bg-white shadow-sm text-gray-900 font-medium"
                        : "text-gray-600 hover:bg-black/5"
                    )}
                >
                    <div className="flex items-center gap-2 truncate flex-1">
                       <MessageSquare size={14} className="opacity-50 shrink-0" />
                       {editingSessionId === session.id ? (
                         <input
                           autoFocus
                           className="bg-black/5 border-none outline-none ring-1 ring-claude-accent/50 rounded px-1 w-full text-sm"
                           value={editTitle}
                           onChange={(e) => setEditTitle(e.target.value)}
                           onKeyDown={(e) => {
                             if (e.key === 'Enter') {
                               onRenameSession(session.id, editTitle);
                               setEditingSessionId(null);
                             } else if (e.key === 'Escape') {
                               setEditingSessionId(null);
                             }
                           }}
                           onBlur={() => {
                             onRenameSession(session.id, editTitle);
                             setEditingSessionId(null);
                           }}
                           onClick={(e) => e.stopPropagation()}
                         />
                       ) : (
                         <span className="truncate">{session.title || 'New Chat'}</span>
                       )}
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

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="fixed z-[100] bg-white border border-black/5 shadow-2xl rounded-xl py-1.5 min-w-[160px] animate-in fade-in zoom-in-95 duration-100"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => {
              const session = sessions.find(s => s.id === contextMenu.sessionId);
              if (session) {
                setEditTitle(session.title || 'New Chat');
                setEditingSessionId(session.id);
              }
              setContextMenu(null);
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-claude-accent hover:text-white transition-colors"
          >
            <Edit2 size={14} />
            <span>重命名</span>
          </button>

          <button
            disabled
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-300 cursor-not-allowed"
          >
            <Archive size={14} />
            <span>归档 (开发中)</span>
          </button>

          <div className="h-px bg-black/5 my-1" />

          <button
            onClick={() => {
              navigator.clipboard.writeText(contextMenu.sessionId);
              setContextMenu(null);
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-black/5 transition-colors"
          >
            <Copy size={14} />
            <span>复制 ID</span>
          </button>

          <button
            onClick={() => {
              if (confirm('确定要删除这个对话吗？')) {
                onDeleteSession(contextMenu.sessionId);
              }
              setContextMenu(null);
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-red-50 transition-colors"
          >
            <Trash2 size={14} />
            <span>删除</span>
          </button>
        </div>
      )}
    </div>
  )
 }

