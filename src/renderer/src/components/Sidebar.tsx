import React, { useEffect, useState } from 'react'
import { Settings, Plus, MessageSquare, Trash2 } from 'lucide-react'
import clsx from 'clsx'

interface Props {
  onOpenSettings: () => void
  onSelectSession: (id: string) => void
  currentSessionId: string | null
  onNewSession: () => void
  refreshTrigger: number
  onDeleteSession?: (id: string) => void
}

export function Sidebar({ onOpenSettings, onSelectSession, currentSessionId, onNewSession, refreshTrigger, onDeleteSession }: Props) {
  const [sessions, setSessions] = useState<any[]>([])

  useEffect(() => {
    loadSessions()
  }, [refreshTrigger])

  const loadSessions = async () => {
      const s = await window.api.getSessions()
      setSessions(s)
  }

  const handleDelete = async (e: React.MouseEvent, id: string) => {
      e.stopPropagation()
      if (confirm('Are you sure you want to delete this chat?')) {
          await window.api.deleteSession(id)
          loadSessions()
          if (onDeleteSession) onDeleteSession(id)
      }
  }

  return (
    <div className="w-64 bg-claude-sidebar flex flex-col border-r border-black/5 h-full">
      {/* Drag region for window moving, but exclude buttons */}
      <div className="pt-14 px-4 pb-4 flex items-center justify-between shrink-0 drag-region">
          <span className="font-serif font-semibold text-xl tracking-tight text-gray-800 select-none no-drag">FlyAi</span>
          <button onClick={onNewSession} className="p-1 hover:bg-black/5 rounded text-gray-600 transition-colors no-drag">
            <Plus size={20} />
          </button>
      </div>
      
      <div className="flex-1 overflow-y-auto px-2 py-2">
          <div className="text-xs font-medium text-gray-500 mb-2 px-2 uppercase tracking-wider">History</div>
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
                onClick={(e) => handleDelete(e, session.id)}
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
    </div>
  )
}