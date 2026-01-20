import React, { useState, useRef, useEffect } from 'react'
import { Send, Paperclip, X, AlertCircle, FileText, Image as ImageIcon, FileCode, File, Bot } from 'lucide-react'
import { ModelSelector } from './ModelSelector'

interface Attachment {
    name: string
    type: string
    data: string // base64
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
  enabledProviders: { gemini: boolean, openai: boolean }
  availableModels: { gemini: string[], openai: string[] }
  lastUsedModelId?: string
  // Agent props
  agents?: Agent[]
  currentAgent?: Agent | null
  onAgentChange?: (agentId: string | null) => void
  onModelChange?: (modelId: string) => void
}

export function InputArea({
  onSend,
  disabled,
  enabledProviders,
  availableModels,
  lastUsedModelId,
  agents = [],
  currentAgent,
  onAgentChange,
  onModelChange
}: Props) {
  const [text, setText] = useState('')
  const [attachments, setAttachments] = useState<Attachment[]>([])
  // Initialize with lastUsedModelId if available, otherwise default
  const [selectedModelId, setSelectedModelId] = useState(lastUsedModelId || 'gemini-2.0-flash-exp')

  // Agent command state
  const [showAgentSelector, setShowAgentSelector] = useState(false)
  const [agentSearchQuery, setAgentSearchQuery] = useState('')
  const [triggerStartPosition, setTriggerStartPosition] = useState(0)

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const agentSelectorRef = useRef<HTMLDivElement>(null)

  // Update local state if prop changes (e.g. on app load finish)
  useEffect(() => {
      if (lastUsedModelId) {
          setSelectedModelId(lastUsedModelId)
      }
  }, [lastUsedModelId])

  // Filter agents based on search query
  const filteredAgents = agents.filter(agent =>
    agent.name.toLowerCase().includes(agentSearchQuery.toLowerCase()) ||
    agent.description.toLowerCase().includes(agentSearchQuery.toLowerCase())
  )

  // Check if current agent's model is available
  const totalModels = [
      ...(enabledProviders.gemini ? availableModels.gemini : []),
      ...(enabledProviders.openai ? availableModels.openai : [])
  ]
  const hasNoModels = totalModels.length === 0

  // Debug: Log when currentAgent changes
  useEffect(() => {
    console.log('🤖 InputArea: currentAgent prop changed to', currentAgent)
  }, [currentAgent])

  // Detect / trigger for agent selector
  useEffect(() => {
    const cursorPosition = text.length
    const textBeforeCursor = text.slice(0, cursorPosition)

    // Check if we just typed a /
    const lastSlashIndex = textBeforeCursor.lastIndexOf('/')

    if (lastSlashIndex !== -1) {
      // Check if there's a space before the / (start of trigger)
      const isStartOfLine = lastSlashIndex === 0
      const hasSpaceBefore = lastSlashIndex > 0 && textBeforeCursor[lastSlashIndex - 1] === ' '

      if (isStartOfLine || hasSpaceBefore) {
        // Extract the search query after /
        const query = textBeforeCursor.slice(lastSlashIndex + 1)
        const hasSpaceAfter = query.includes(' ')

        if (!hasSpaceAfter) {
          // Show agent selector
          setTriggerStartPosition(lastSlashIndex)
          setAgentSearchQuery(query)
          setShowAgentSelector(true)
          return
        }
      }
    }

    // Hide selector if trigger pattern not found
    setShowAgentSelector(false)
    setAgentSearchQuery('')
  }, [text])

  // Close selector when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        agentSelectorRef.current &&
        !agentSelectorRef.current.contains(event.target as Node) &&
        textareaRef.current &&
        !textareaRef.current.contains(event.target as Node)
      ) {
        setShowAgentSelector(false)
      }
    }

    if (showAgentSelector) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showAgentSelector])

  // Handle agent selection
  const handleAgentSelect = (agent: Agent | null) => {
    console.log('🤖 InputArea: handleAgentSelect called', agent)
    if (!onAgentChange) return

    // Call the agent change handler
    onAgentChange(agent?.id || null)
    console.log('🤖 InputArea: onAgentChange called with', agent?.id || null)

    // Remove the /command from text
    const beforeTrigger = text.slice(0, triggerStartPosition)
    const afterTrigger = text.slice(triggerStartPosition + 1 + agentSearchQuery.length)
    setText(`${beforeTrigger}${afterTrigger}`)

    setShowAgentSelector(false)
    setAgentSearchQuery('')

    console.log('🤖 InputArea: currentAgent prop is now', currentAgent)

    // Focus back on textarea
    setTimeout(() => {
      textareaRef.current?.focus()
    }, 0)
  }

  // Handle remove agent
  const handleRemoveAgent = () => {
    if (onAgentChange) {
      onAgentChange(null)
    }
  }

  // Handle keyboard navigation in agent selector
  const handleAgentKeyDown = (e: React.KeyboardEvent) => {
    if (!showAgentSelector) return

    if (e.key === 'Escape') {
      e.preventDefault()
      setShowAgentSelector(false)
      setAgentSearchQuery('')
    } else if (e.key === 'Enter' && filteredAgents.length > 0) {
      e.preventDefault()
      handleAgentSelect(filteredAgents[0])
    }
  }

  // Save selection whenever it changes
  const handleModelSelect = (id: string) => {
      setSelectedModelId(id)
      window.api.saveSetting('last_model_id', id)
  }

  // Ensure selected model is valid (auto-switch logic)
  useEffect(() => {
      if (hasNoModels) return

      const isGemini = selectedModelId.startsWith('gemini')
      const isGeminiAvailable = enabledProviders.gemini && availableModels.gemini.length > 0
      const isOpenAIAvailable = enabledProviders.openai && availableModels.openai.length > 0

      let newId = selectedModelId

      if (isGemini && !isGeminiAvailable) {
          if (isOpenAIAvailable) newId = availableModels.openai[0]
      } else if (!isGemini && !isOpenAIAvailable) {
          if (isGeminiAvailable) newId = availableModels.gemini[0]
      }
      
      if (isGemini && !availableModels.gemini.includes(newId) && isGeminiAvailable) {
          newId = availableModels.gemini[0]
      }
      if (!isGemini && !availableModels.openai.includes(newId) && isOpenAIAvailable) {
          newId = availableModels.openai[0]
      }
      
      if (newId !== selectedModelId) {
          setSelectedModelId(newId)
          // Don't necessarily save here to avoid overriding user pref if provider temporarily disabled, 
          // but for simplicity we sync UI state.
      }
      
  }, [enabledProviders, availableModels, hasNoModels, selectedModelId])

  const handleSend = () => {
    if ((text.trim() || attachments.length > 0) && !disabled && !hasNoModels) {
      onSend(text, attachments, selectedModelId)
      setText('')
      setAttachments([])
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // 检查是否在输入法中（中文、日文等）
    const isComposing = e.nativeEvent.isComposing

    // Handle agent selector keyboard events
    handleAgentKeyDown(e)

    // Shift+Enter 换行，Enter 发送（但输入法中的 Enter 不发送）
    if (e.key === 'Enter' && !e.shiftKey && !isComposing) {
      // Don't send if agent selector is open
      if (showAgentSelector) {
        e.preventDefault()
        if (filteredAgents.length > 0) {
          handleAgentSelect(filteredAgents[0])
        }
        return
      }
      e.preventDefault()
      handleSend()
    }
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    await processFiles(files)
    e.target.value = ''
  }

  const processFiles = async (files: File[]) => {
    const newAttachments: Attachment[] = []

    for (const file of files) {
        if (file.size > 10 * 1024 * 1024) { // Increased limit to 10MB
            alert(`File ${file.name} is too large (>10MB).`)
            continue
        }

        const reader = new FileReader()
        const base64Promise = new Promise<string>((resolve) => {
            reader.onloadend = () => resolve(reader.result as string)
        })
        reader.readAsDataURL(file)
        const base64 = await base64Promise

        newAttachments.push({
            name: file.name,
            type: file.type,
            data: base64,
            size: file.size
        })
    }

    setAttachments(prev => [...prev, ...newAttachments])
  }

  const handlePaste = async (e: React.ClipboardEvent) => {
    const clipboardData = e.clipboardData
    if (!clipboardData) return

    const items = Array.from(clipboardData.items)
    const files: File[] = []

    for (const item of items) {
      if (item.kind === 'file') {
        const file = item.getAsFile()
        if (file) {
          files.push(file)
        }
      }
    }

    if (files.length > 0) {
      e.preventDefault()
      await processFiles(files)
    }
  }

  const removeAttachment = (index: number) => {
      setAttachments(prev => prev.filter((_, i) => i !== index))
  }

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px'
    }
  }, [text])

  const getFileIcon = (type: string) => {
      if (type.startsWith('image/')) return <ImageIcon size={24} className="text-purple-500" />
      if (type.includes('text') || type.includes('json') || type.includes('javascript')) return <FileCode size={24} className="text-blue-500" />
      if (type.includes('pdf')) return <FileText size={24} className="text-red-500" />
      return <File size={24} className="text-gray-500" />
  }

  return (
    <div className="p-6 pb-8 max-w-4xl mx-auto w-full z-10 bg-gradient-to-t from-claude-bg via-claude-bg to-transparent">
        <div className={`bg-white rounded-xl shadow-sm border ${hasNoModels ? 'border-red-200 bg-red-50/10' : 'border-black/10'} focus-within:ring-2 focus-within:ring-claude-accent/20 transition-all p-3 relative`}>

            {/* Current Agent Tag */}
            {currentAgent && (
              <div className="mb-3 px-1">
                <div className="flex items-center gap-2">
                  <div
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg border shadow-sm"
                    style={{
                      backgroundColor: `${currentAgent.avatar_color}10`,
                      borderColor: `${currentAgent.avatar_color}30`
                    }}
                  >
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-white"
                      style={{ backgroundColor: currentAgent.avatar_color }}
                    >
                      <Bot size={12} />
                    </div>
                    <span className="text-sm font-medium" style={{ color: currentAgent.avatar_color }}>
                      {currentAgent.name}
                    </span>
                    <button
                      onClick={handleRemoveAgent}
                      className="ml-1 p-0.5 rounded hover:bg-black/5 transition-colors"
                      style={{ color: currentAgent.avatar_color }}
                    >
                      <X size={14} />
                    </button>
                  </div>
                  <div className="text-xs text-gray-400 truncate flex-1">
                    {currentAgent.description}
                  </div>
                </div>
              </div>
            )}
            
            {attachments.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3 px-1">
                    {attachments.map((att, i) => (
                        <div key={i} className="group relative flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg p-2 pr-8 shadow-sm hover:shadow-md transition-all">
                            {att.type.startsWith('image/') ? (
                                <img src={att.data} alt={att.name} className="w-8 h-8 object-cover rounded bg-white" />
                            ) : (
                                <div className="w-8 h-8 flex items-center justify-center bg-white rounded border border-gray-100">
                                    {getFileIcon(att.type)}
                                </div>
                            )}
                            
                            <div className="flex flex-col min-w-[60px] max-w-[120px]">
                                <span className="text-xs font-medium text-gray-700 truncate" title={att.name}>{att.name}</span>
                                <span className="text-[10px] text-gray-400 uppercase">{(att.size / 1024).toFixed(0)} KB</span>
                            </div>

                            <button 
                                onClick={() => removeAttachment(i)}
                                className="absolute top-1 right-1 p-1 text-gray-400 hover:text-red-500 rounded-full hover:bg-white transition-colors"
                            >
                                <X size={14} />
                            </button>
                        </div>
                    ))}
                </div>
            )}
            
            <textarea
                ref={textareaRef}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={handleKeyDown}
                onPaste={handlePaste}
                placeholder={hasNoModels ? "No models available..." : "Type a message... (Supports pasting files, use / to select agent)"}
                className="w-full resize-none outline-none text-gray-800 placeholder:text-gray-400 min-h-[50px] max-h-[200px] bg-transparent py-1 px-1"
                rows={1}
                disabled={disabled || hasNoModels}
            />

            {/* Agent Selector */}
            {showAgentSelector && (
              <div
                ref={agentSelectorRef}
                className="absolute left-0 right-0 bottom-full mb-2 mx-auto max-w-2xl bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden z-50 animate-in fade-in zoom-in duration-150"
              >
                <div className="p-2 border-b border-gray-100 bg-gray-50">
                  <div className="text-xs font-medium text-gray-500 flex items-center gap-1">
                    <Bot size={12} />
                    选择智能体 (输入搜索，Enter 选择，Esc 取消)
                  </div>
                </div>
                <div className="max-h-64 overflow-y-auto p-2">
                  {filteredAgents.length === 0 ? (
                    <div className="py-8 text-center text-gray-500 text-sm">
                      {agentSearchQuery ? (
                        <>
                          <p>没有匹配的智能体</p>
                          <p className="text-xs mt-1 text-gray-400">尝试其他关键词</p>
                        </>
                      ) : (
                        <>
                          <p>暂无智能体</p>
                          <p className="text-xs mt-1 text-gray-400">在设置中创建智能体</p>
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {filteredAgents.map((agent, index) => (
                        <button
                          key={agent.id}
                          onClick={() => handleAgentSelect(agent)}
                          className={clsx(
                            "w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 transition-colors text-left",
                            index === 0 && "bg-claude-accent/10 hover:bg-claude-accent/15"
                          )}
                        >
                          <div
                            className="w-10 h-10 rounded-full flex items-center justify-center text-white shrink-0"
                            style={{ backgroundColor: agent.avatar_color }}
                          >
                            <Bot size={18} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-gray-900 truncate">{agent.name}</div>
                            <div className="text-xs text-gray-500 truncate">{agent.description}</div>
                          </div>
                          {index === 0 && (
                            <div className="text-xs text-gray-400">Enter</div>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex justify-between items-center mt-2 px-1 border-t border-gray-100 pt-2">
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1">
                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            className="hidden" 
                            multiple
                            onChange={handleFileSelect}
                        />
                        <button 
                            onClick={() => fileInputRef.current?.click()}
                            disabled={hasNoModels}
                            className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-all rounded-md disabled:opacity-30 disabled:pointer-events-none flex items-center gap-2" 
                            title="Attach Files"
                        >
                            <Paperclip size={18} />
                            <span className="text-xs font-medium">Attach</span>
                        </button>
                    </div>
                    
                    <div className="w-px h-4 bg-gray-200" />
                    
                    {hasNoModels ? (
                        <div className="flex items-center gap-1.5 text-red-500 text-xs font-medium px-2 py-1 bg-red-50 rounded">
                            <AlertCircle size={12} />
                            <span>No Models</span>
                        </div>
                    ) : (
                        <ModelSelector 
                            selectedModelId={selectedModelId} 
                            onSelectModel={handleModelSelect}
                            enabledProviders={enabledProviders}
                            availableModels={availableModels}
                        />
                    )}
                </div>

                <button 
                    onClick={handleSend}
                    disabled={(!text.trim() && attachments.length === 0) || disabled || hasNoModels}
                    className="bg-claude-accent text-white p-1.5 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                >
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

// Helper function for clsx
function clsx(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ')
}
