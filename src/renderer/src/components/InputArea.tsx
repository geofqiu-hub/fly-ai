import React, { useState, useRef, useEffect } from 'react'
import { Send, Paperclip, Bot, X, Image as ImageIcon } from 'lucide-react'
import { ModelSelector } from './ModelSelector'
import type { Model } from '../types/chat'

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

/** 单条消息最大字符数，避免 IPC/API 负载过大导致「输入内容超长」 */
const MAX_INPUT_LENGTH = 100_000

interface Props {
  onSend: (text: string, attachments: Attachment[], modelId?: string) => void
  disabled: boolean
  currentAgent?: Agent | null
  currentModel?: Model | null
  onSelectModel?: (model: Model | null) => void
  canChangeModel?: boolean
  onSelectAgent?: (agentId: string | null) => void | Promise<void>
}

export function InputArea({ onSend, disabled, currentAgent, currentModel, onSelectModel, canChangeModel = true, onSelectAgent }: Props) {
  const [text, setText] = useState('')
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [showAgentList, setShowAgentList] = useState(false)
  const [agents, setAgents] = useState<Agent[]>([])
  const [highlightedIndex, setHighlightedIndex] = useState(0)
  const [agentTriggerIndex, setAgentTriggerIndex] = useState<number | null>(null)

  const loadAgents = async () => {
    try {
      let loadedAgents = await window.api.getAgents()
      if (!loadedAgents || loadedAgents.length === 0) {
        const presets = await window.api.getPresetAgents()
        if (presets && presets.length > 0) {
          // 将预置智能体写入数据库，供后续使用
          for (const preset of presets) {
            await window.api.createAgentFromPreset(preset.id)
          }
          loadedAgents = await window.api.getAgents()
        }
      }
      if (loadedAgents && loadedAgents.length > 0) {
        let orderedAgents = loadedAgents

        // 默认将“上次选择的智能体”移动到列表第一位，并高亮它
        try {
          const lastAgentId = await window.api.getSetting('last_used_agent')
          if (lastAgentId) {
            const idx = loadedAgents.findIndex(agent => agent.id === lastAgentId)
            if (idx >= 0) {
              const lastAgent = loadedAgents[idx]
              orderedAgents = [lastAgent, ...loadedAgents.filter((_, i) => i !== idx)]
            }
          }
        } catch (e) {
          console.warn('Failed to get last_used_agent setting:', e)
        }

        setAgents(orderedAgents)
        setHighlightedIndex(0) // 列表第一个就是“默认选中”的智能体
        setShowAgentList(true)
      }
    } catch (error) {
      console.error('Failed to load agents:', error)
    }
  }

  const handleSelectAgent = async (agent: Agent) => {
    setShowAgentList(false)

    // 将输入中的 "#" 触发符以及紧随其后的连续非空白字符删除
    if (agentTriggerIndex !== null) {
      const currentValue = text
      const chars = currentValue.split('')
      if (agentTriggerIndex >= 0 && agentTriggerIndex < chars.length && chars[agentTriggerIndex] === '#') {
        let end = agentTriggerIndex + 1
        while (end < chars.length && !/\s/.test(chars[end])) {
          end++
        }
        const newValue = currentValue.slice(0, agentTriggerIndex) + currentValue.slice(end)
        setText(newValue)

        // 恢复光标位置到原来的 "#" 所在处
        requestAnimationFrame(() => {
          if (textareaRef.current) {
            textareaRef.current.selectionStart = textareaRef.current.selectionEnd = agentTriggerIndex
            textareaRef.current.focus()
          }
        })
      }
    }

    setAgentTriggerIndex(null)

    if (onSelectAgent) {
      await onSelectAgent(agent.id)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Check if the user is currently using an IME (Input Method Editor)
    if (e.nativeEvent.isComposing) return

    if (e.key === '#' && !showAgentList) {
      // 输入 # 时尝试唤出智能体列表（仅在词首或行首触发）
      const el = textareaRef.current
      const cursor = el?.selectionStart ?? text.length
      const beforeChar = cursor > 0 ? text[cursor - 1] : ' '
      if (/\s/.test(beforeChar)) {
        setAgentTriggerIndex(cursor) // 此时 # 将出现在该位置
        loadAgents()
      }
    }

    if (showAgentList) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setHighlightedIndex(prev => (prev + 1) % (agents.length || 1))
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setHighlightedIndex(prev => (prev - 1 + (agents.length || 1)) % (agents.length || 1))
        return
      }
      if (e.key === 'Enter') {
        if (agents[highlightedIndex]) {
          e.preventDefault()
          handleSelectAgent(agents[highlightedIndex])
          return
        }
      }
      if (e.key === 'Escape') {
        e.preventDefault()
        setShowAgentList(false)
        setAgentTriggerIndex(null)
        return
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items
    const newAttachments: Attachment[] = []

      for (let i = 0; i < items.length; i++) {
        // Handle Files (including images and other documents)
        if (items[i].kind === 'file') {
          const file = items[i].getAsFile()
          if (file) {
            const data = await new Promise<string>((resolve) => {
              const reader = new FileReader()
              reader.onload = (e) => resolve(e.target?.result as string)
              reader.readAsDataURL(file)
            })

            newAttachments.push({
              name: file.name || `pasted_file_${Date.now()}`,
              type: file.type || 'application/octet-stream',
              data: data,
              size: file.size
            })
          }
        } 
      }

    if (newAttachments.length > 0) {
      setAttachments(prev => [...prev, ...newAttachments])
    }
  }

  const handleSend = () => {
    if ((!text.trim() && attachments.length === 0) || disabled) return
    onSend(text.trim(), attachments, currentModel?.modelId)
    setText('')
    setAttachments([])
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    const newAttachments: Attachment[] = []
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const data = await new Promise<string>((resolve) => {
        const reader = new FileReader()
        reader.onload = (e) => resolve(e.target?.result as string)
        reader.readAsDataURL(file)
      })

      newAttachments.push({
        name: file.name,
        type: file.type,
        data: data,
        size: file.size
      })
    }

    setAttachments(prev => [...prev, ...newAttachments])
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index))
  }

  const handleTextareaResize = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px'
    }
  }

  return (
    <div className="p-6 pb-8 max-w-4xl mx-auto w-full z-10 bg-gradient-to-t from-claude-bg via-claude-bg to-transparent">
        <div className="bg-white rounded-xl shadow-sm border border-black/10 focus-within:ring-2 focus-within:ring-claude-accent/20 transition-all p-3 relative">
            
            {/* Attachments Preview */}
            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-3 mb-3 px-1">
                {attachments.map((file, idx) => (
                  <div key={idx} className="relative group">
                    {file.type?.startsWith('image/') ? (
                      <div className="w-16 h-16 rounded-lg overflow-hidden border border-black/10 shadow-sm relative">
                        <img src={file.data} alt={file.name} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/5 group-hover:bg-black/20 transition-colors" />
                      </div>
                    ) : (
                      <div className="h-16 flex items-center gap-3 px-3 bg-gray-50/50 rounded-xl border border-black/5 max-w-[200px] group-hover:bg-gray-100/50 transition-colors">
                        <div className="w-10 h-10 flex items-center justify-center bg-white rounded-lg border border-black/5 shrink-0 shadow-sm">
                          <Paperclip size={18} className="text-gray-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[11px] font-semibold text-gray-700 truncate">{file.name}</div>
                          <div className="text-[10px] text-gray-400 mt-0.5">{(file.size / 1024).toFixed(1)} KB</div>
                        </div>
                      </div>
                    )}
                    <button 
                      onClick={() => removeAttachment(idx)}
                      className="absolute -top-2 -right-2 bg-gray-900 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity z-10 shadow-lg hover:scale-110 active:scale-95"
                    >
                      <X size={10} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Current Agent Tag */}
            {currentAgent && (
              <div className="mb-3 px-1">
                <div className="flex items-center gap-2">
                  <div
                    className="relative flex items-center gap-2 px-3 py-1.5 rounded-lg border shadow-sm pr-7"
                    style={{ backgroundColor: `${currentAgent.avatar_color}10`, borderColor: `${currentAgent.avatar_color}30` }}
                  >
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-white" style={{ backgroundColor: currentAgent.avatar_color }}>
                      <Bot size={12} />
                    </div>
                    <span className="text-sm font-medium" style={{ color: currentAgent.avatar_color }}>
                      {currentAgent.name}
                    </span>
                    {onSelectAgent && (
                      <button
                        type="button"
                        onClick={async () => {
                          await onSelectAgent(null)
                        }}
                        className="absolute -top-1 -right-1 p-1 rounded-full bg-white border border-black/10 text-gray-400 hover:text-gray-700 hover:bg-gray-50 shadow-sm transition-colors"
                        title="移除当前智能体"
                      >
                        <X size={10} />
                      </button>
                    )}
                  </div>
                  <div className="text-xs text-gray-400 truncate flex-1">
                    {currentAgent.description}
                  </div>
                </div>
              </div>
            )}

            {/* Agent Selector Dropdown (triggered by #) */}
            {showAgentList && agents.length > 0 && (
              <div className="absolute bottom-20 left-3 w-80 max-h-72 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg z-20">
                <div className="px-3 py-2 border-b border-gray-100 text-xs text-gray-500">
                  选择一个智能体（↑↓ 切换，Enter 确认，Esc 关闭）
                </div>
                <ul className="py-1">
                  {agents.map((agent, index) => (
                    <li
                      key={agent.id}
                      onMouseDown={(e) => {
                        // 使用 onMouseDown 避免 textarea 失焦导致状态丢失
                        e.preventDefault()
                        handleSelectAgent(agent)
                      }}
                      className={`px-3 py-2 text-sm cursor-pointer flex items-start gap-2 ${
                        index === highlightedIndex ? 'bg-claude-accent/10 text-claude-accent' : 'hover:bg-gray-50'
                      }`}
                    >
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] shrink-0"
                        style={{ backgroundColor: agent.avatar_color }}
                      >
                        <Bot size={12} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{agent.name}</div>
                        <div className="text-xs text-gray-400 truncate">{agent.description}</div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <textarea
                ref={textareaRef}
                value={text}
                onChange={(e) => {
                  const value = e.target.value
                  const capped = value.length > MAX_INPUT_LENGTH ? value.slice(0, MAX_INPUT_LENGTH) : value
                  setText(capped)
                  handleTextareaResize()

                  // 如果用户删除了 "#" 触发符，则关闭智能体列表
                  if (showAgentList && !capped.includes('#')) {
                    setShowAgentList(false)
                    setAgentTriggerIndex(null)
                  }
                }}
                onKeyDown={handleKeyDown}
                onPaste={handlePaste}
                placeholder="Type a message... (Enter to send, Shift+Enter for new line)"
                className="w-full resize-none outline-none text-gray-800 placeholder:text-gray-400 min-h-[50px] max-h-[200px] bg-transparent py-1 px-1"
                rows={1}
                disabled={disabled}
            />

            {text.length >= MAX_INPUT_LENGTH && (
              <div className="mt-1 px-1 text-xs text-amber-600" role="alert">
                输入内容超长了（最多 {MAX_INPUT_LENGTH.toLocaleString()} 字），请适当缩短后重试。
              </div>
            )}
            <div className="flex justify-between items-center mt-2 px-1 border-t border-gray-100 pt-2">
                <div className="flex items-center gap-3">
                    <ModelSelector
                      selectedModelId={currentModel?.modelId}
                      onSelectModel={onSelectModel || (() => {})}
                      disabled={!canChangeModel}
                    />
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={handleFileChange} 
                      className="hidden" 
                      multiple 
                      accept="image/*,.pdf,.txt,.md,.json,.csv,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                    />
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-all rounded-md disabled:opacity-30 disabled:pointer-events-none flex items-center gap-2" 
                      title="Attach Files"
                    >
                        <Paperclip size={18} />
                        <span className="text-xs font-medium">Attach</span>
                    </button>
                </div>

                <button
                    onClick={handleSend}
                    disabled={(!text.trim() && attachments.length === 0) || disabled || text.length >= MAX_INPUT_LENGTH}
                    className="bg-claude-accent text-white p-1.5 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                >
                    <Send size={16} />
                </button>
            </div>
        </div>
        <div className="text-center mt-2 text-xs text-gray-400">
            FlyAI 可能会出错。请核实重要信息.
        </div>
    </div>
  )
}

export default InputArea
