import React, { useState, useRef, useEffect } from 'react'
import { Send, Paperclip, X, AlertCircle, FileText, Image as ImageIcon, FileCode, File } from 'lucide-react'
import { ModelSelector } from './ModelSelector'

interface Attachment {
    name: string
    type: string
    data: string // base64
    size: number
}

interface Props {
  onSend: (text: string, attachments: Attachment[], modelId?: string) => void
  disabled: boolean
  enabledProviders: { gemini: boolean, openai: boolean }
  availableModels: { gemini: string[], openai: string[] }
  lastUsedModelId?: string
}

export function InputArea({ onSend, disabled, enabledProviders, availableModels, lastUsedModelId }: Props) {
  const [text, setText] = useState('')
  const [attachments, setAttachments] = useState<Attachment[]>([])
  // Initialize with lastUsedModelId if available, otherwise default
  const [selectedModelId, setSelectedModelId] = useState(lastUsedModelId || 'gemini-2.0-flash-exp')
  
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const totalModels = [
      ...(enabledProviders.gemini ? availableModels.gemini : []),
      ...(enabledProviders.openai ? availableModels.openai : [])
  ]
  const hasNoModels = totalModels.length === 0

  // Update local state if prop changes (e.g. on app load finish)
  useEffect(() => {
      if (lastUsedModelId) {
          setSelectedModelId(lastUsedModelId)
      }
  }, [lastUsedModelId])

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
    // Shift+Enter 换行，Enter 发送（但输入法中的 Enter 不发送）
    if (e.key === 'Enter' && !e.shiftKey && !isComposing) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

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
    e.target.value = ''
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
                placeholder={hasNoModels ? "No models available..." : "Type a message..."}
                className="w-full resize-none outline-none text-gray-800 placeholder:text-gray-400 min-h-[50px] max-h-[200px] bg-transparent py-1 px-1"
                rows={1}
                disabled={disabled || hasNoModels}
            />
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
