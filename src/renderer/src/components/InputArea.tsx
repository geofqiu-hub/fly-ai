import React from 'react'
import { Send, Paperclip, Bot } from 'lucide-react'

interface Attachment {
    name: string
    type: string
    data: string
    size: number
}

interface Agent {
  id: string
  name: string
  description: string
  system_prompt: string
  avatar_color: string
  model_id?: string
  temperature?: number
}

interface Props {
  onSend: (text: string, attachments: Attachment[], modelId?: string) => void
  disabled: boolean
  currentAgent?: Agent | null
  onAgentChange?: (agentId: string | null) => void
}

export function InputArea({ onSend, disabled, currentAgent }: Props) {
  // TODO: 实现输入状态管理
  const text = ''
  const attachments: Attachment[] = []

  return (
    <div className="p-6 pb-8 max-w-4xl mx-auto w-full z-10 bg-gradient-to-t from-claude-bg via-claude-bg to-transparent">
        <div className="bg-white rounded-xl shadow-sm border border-black/10 focus-within:ring-2 focus-within:ring-claude-accent/20 transition-all p-3 relative">

            {/* Current Agent Tag */}
            {currentAgent && (
              <div className="mb-3 px-1">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border shadow-sm" style={{ backgroundColor: `${currentAgent.avatar_color}10`, borderColor: `${currentAgent.avatar_color}30` }}>
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-white" style={{ backgroundColor: currentAgent.avatar_color }}>
                      <Bot size={12} />
                    </div>
                    <span className="text-sm font-medium" style={{ color: currentAgent.avatar_color }}>
                      {currentAgent.name}
                    </span>
                  </div>
                  <div className="text-xs text-gray-400 truncate flex-1">
                    {currentAgent.description}
                  </div>
                </div>
              </div>
            )}

            {/* Attachments */}
            {attachments.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3 px-1">
                    {/* TODO: 实现附件列表渲染 */}
                </div>
            )}

            <textarea
                placeholder="Type a message..."
                className="w-full resize-none outline-none text-gray-800 placeholder:text-gray-400 min-h-[50px] max-h-[200px] bg-transparent py-1 px-1"
                rows={1}
                disabled={disabled}
            />

            <div className="flex justify-between items-center mt-2 px-1 border-t border-gray-100 pt-2">
                <div className="flex items-center gap-3">
                    <button className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-all rounded-md disabled:opacity-30 disabled:pointer-events-none flex items-center gap-2" title="Attach Files">
                        <Paperclip size={18} />
                        <span className="text-xs font-medium">Attach</span>
                    </button>
                </div>

                <button className="bg-claude-accent text-white p-1.5 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed shadow-sm">
                    <Send size={16} />
                </button>
            </div>
        </div>
        <div className="text-center mt-2 text-xs text-gray-400">
            FlyAi can make mistakes. Please verify important information.
        </div>
    </div>
  )
}
