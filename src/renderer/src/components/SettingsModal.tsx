import React, { useState, useEffect } from 'react'
import { X, Save, Check, Plus, Trash2 } from 'lucide-react'
import clsx from 'clsx'

interface Props {
  isOpen: boolean
  onClose: () => void
  onSettingsChanged?: () => void
}

const DEFAULT_MODELS = {
    gemini: ['gemini-2.0-flash-exp', 'gemini-1.5-pro'],
    openai: ['gpt-4o', 'gpt-4o-mini', 'gpt-3.5-turbo']
}

export function SettingsModal({ isOpen, onClose, onSettingsChanged }: Props) {
  const [geminiKey, setGeminiKey] = useState('')
  const [openaiKey, setOpenaiKey] = useState('')
  const [geminiBaseUrl, setGeminiBaseUrl] = useState('')
  const [openaiBaseUrl, setOpenaiBaseUrl] = useState('')
  
  const [geminiEnabled, setGeminiEnabled] = useState(true)
  const [openaiEnabled, setOpenaiEnabled] = useState(false)
  
  const [geminiModels, setGeminiModels] = useState<string[]>([])
  const [openaiModels, setOpenaiModels] = useState<string[]>([])
  const [newModelInput, setNewModelInput] = useState('')
  
  const [activeTab, setActiveTab] = useState<'gemini' | 'openai'>('gemini')

  useEffect(() => {
    if (isOpen) {
      loadSettings()
    }
  }, [isOpen])

  const loadSettings = async () => {
    const gKey = await window.api.getSetting('gemini_api_key')
    const oKey = await window.api.getSetting('openai_api_key')
    const gUrl = await window.api.getSetting('gemini_base_url')
    const oUrl = await window.api.getSetting('openai_base_url')
    
    const gEnabled = await window.api.getSetting('gemini_enabled')
    const oEnabled = await window.api.getSetting('openai_enabled')

    const gModelsStr = await window.api.getSetting('gemini_models')
    const oModelsStr = await window.api.getSetting('openai_models')

    if (gKey) setGeminiKey(gKey)
    if (oKey) setOpenaiKey(oKey)
    if (gUrl) setGeminiBaseUrl(gUrl)
    if (oUrl) setOpenaiBaseUrl(oUrl)
    
    setGeminiEnabled(gEnabled === 'true' || gEnabled === null)
    setOpenaiEnabled(oEnabled === 'true')

    setGeminiModels(gModelsStr ? JSON.parse(gModelsStr) : DEFAULT_MODELS.gemini)
    setOpenaiModels(oModelsStr ? JSON.parse(oModelsStr) : DEFAULT_MODELS.openai)
  }

  const handleSave = async () => {
    await window.api.saveSetting('gemini_api_key', geminiKey)
    await window.api.saveSetting('openai_api_key', openaiKey)
    await window.api.saveSetting('gemini_base_url', geminiBaseUrl)
    await window.api.saveSetting('openai_base_url', openaiBaseUrl)
    
    await window.api.saveSetting('gemini_enabled', String(geminiEnabled))
    await window.api.saveSetting('openai_enabled', String(openaiEnabled))

    await window.api.saveSetting('gemini_models', JSON.stringify(geminiModels))
    await window.api.saveSetting('openai_models', JSON.stringify(openaiModels))
    
    if (onSettingsChanged) onSettingsChanged()
    onClose()
  }

  const handleAddModel = () => {
      if (!newModelInput.trim()) return
      
      if (activeTab === 'gemini') {
          if (!geminiModels.includes(newModelInput.trim())) {
              setGeminiModels([...geminiModels, newModelInput.trim()])
          }
      } else {
           if (!openaiModels.includes(newModelInput.trim())) {
              setOpenaiModels([...openaiModels, newModelInput.trim()])
          }
      }
      setNewModelInput('')
  }

  const handleDeleteModel = (model: string) => {
      if (activeTab === 'gemini') {
          setGeminiModels(geminiModels.filter(m => m !== model))
      } else {
          setOpenaiModels(openaiModels.filter(m => m !== model))
      }
  }

  if (!isOpen) return null

  const currentModels = activeTab === 'gemini' ? geminiModels : openaiModels

  return (
    <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-[600px] flex flex-col max-h-[85vh] overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="flex justify-between items-center p-5 border-b border-gray-100 bg-gray-50/50">
          <h2 className="text-lg font-semibold text-gray-800">Settings</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <div className="flex flex-1 overflow-hidden">
            {/* Sidebar Tabs */}
            <div className="w-40 bg-gray-50 border-r border-gray-100 p-2 space-y-1 shrink-0">
                <button 
                    onClick={() => setActiveTab('gemini')}
                    className={clsx(
                        "w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2",
                        activeTab === 'gemini' ? "bg-white shadow-sm text-claude-accent" : "text-gray-600 hover:bg-gray-100"
                    )}
                >
                    Gemini
                    {geminiEnabled && <div className="w-1.5 h-1.5 rounded-full bg-green-500 ml-auto" />}
                </button>
                <button 
                    onClick={() => setActiveTab('openai')}
                    className={clsx(
                        "w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2",
                        activeTab === 'openai' ? "bg-white shadow-sm text-claude-accent" : "text-gray-600 hover:bg-gray-100"
                    )}
                >
                    OpenAI
                    {openaiEnabled && <div className="w-1.5 h-1.5 rounded-full bg-green-500 ml-auto" />}
                </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 p-6 overflow-y-auto">
                
                {/* Gemini Panel */}
                {activeTab === 'gemini' && (
                    <div className="space-y-6">
                         <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-base font-medium text-gray-900">Google Gemini</h3>
                                <p className="text-xs text-gray-500">Fast, multimodal models by Google.</p>
                            </div>
                            <button 
                                onClick={() => setGeminiEnabled(!geminiEnabled)}
                                className={clsx(
                                    "w-12 h-6 rounded-full transition-colors relative focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-claude-accent/50",
                                    geminiEnabled ? "bg-claude-accent" : "bg-gray-200"
                                )}
                            >
                                <div className={clsx(
                                    "absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform shadow-sm",
                                    geminiEnabled ? "translate-x-6" : "translate-x-0"
                                )} />
                            </button>
                        </div>

                        {geminiEnabled && (
                            <div className="space-y-5 animate-in slide-in-from-top-2 duration-200">
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">API Key</label>
                                    <input
                                        type="password"
                                        value={geminiKey}
                                        onChange={(e) => setGeminiKey(e.target.value)}
                                        placeholder="AIza..."
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-claude-accent/20 focus:border-claude-accent/50 text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Base URL (Optional)</label>
                                    <input
                                        type="text"
                                        value={geminiBaseUrl}
                                        onChange={(e) => setGeminiBaseUrl(e.target.value)}
                                        placeholder="https://generativelanguage.googleapis.com"
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-claude-accent/20 focus:border-claude-accent/50 text-sm font-mono"
                                    />
                                </div>
                                
                                <div className="pt-2 border-t border-gray-100">
                                    <label className="block text-xs font-medium text-gray-700 mb-2">Available Models</label>
                                    <div className="flex flex-wrap gap-2 mb-3">
                                        {geminiModels.map(model => (
                                            <div key={model} className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded-md text-sm text-gray-700 border border-gray-200">
                                                <span>{model}</span>
                                                <button onClick={() => handleDeleteModel(model)} className="text-gray-400 hover:text-red-500">
                                                    <X size={12} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="flex gap-2">
                                        <input 
                                            type="text"
                                            value={newModelInput}
                                            onChange={(e) => setNewModelInput(e.target.value)}
                                            placeholder="Add model ID (e.g. gemini-2.0-pro)"
                                            className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-claude-accent/50"
                                            onKeyDown={(e) => e.key === 'Enter' && handleAddModel()}
                                        />
                                        <button 
                                            onClick={handleAddModel}
                                            className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors"
                                        >
                                            Add
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* OpenAI Panel */}
                {activeTab === 'openai' && (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-base font-medium text-gray-900">OpenAI</h3>
                                <p className="text-xs text-gray-500">GPT-4o, GPT-3.5 and more.</p>
                            </div>
                            <button 
                                onClick={() => setOpenaiEnabled(!openaiEnabled)}
                                className={clsx(
                                    "w-12 h-6 rounded-full transition-colors relative focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-claude-accent/50",
                                    openaiEnabled ? "bg-claude-accent" : "bg-gray-200"
                                )}
                            >
                                <div className={clsx(
                                    "absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform shadow-sm",
                                    openaiEnabled ? "translate-x-6" : "translate-x-0"
                                )} />
                            </button>
                        </div>

                        {openaiEnabled && (
                            <div className="space-y-5 animate-in slide-in-from-top-2 duration-200">
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">API Key</label>
                                    <input
                                        type="password"
                                        value={openaiKey}
                                        onChange={(e) => setOpenaiKey(e.target.value)}
                                        placeholder="sk-..."
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-claude-accent/20 focus:border-claude-accent/50 text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Base URL (Optional)</label>
                                    <input
                                        type="text"
                                        value={openaiBaseUrl}
                                        onChange={(e) => setOpenaiBaseUrl(e.target.value)}
                                        placeholder="https://api.openai.com/v1"
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-claude-accent/20 focus:border-claude-accent/50 text-sm font-mono"
                                    />
                                </div>

                                <div className="pt-2 border-t border-gray-100">
                                    <label className="block text-xs font-medium text-gray-700 mb-2">Available Models</label>
                                    <div className="flex flex-wrap gap-2 mb-3">
                                        {openaiModels.map(model => (
                                            <div key={model} className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded-md text-sm text-gray-700 border border-gray-200">
                                                <span>{model}</span>
                                                <button onClick={() => handleDeleteModel(model)} className="text-gray-400 hover:text-red-500">
                                                    <X size={12} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="flex gap-2">
                                        <input 
                                            type="text"
                                            value={newModelInput}
                                            onChange={(e) => setNewModelInput(e.target.value)}
                                            placeholder="Add model ID (e.g. gpt-4-turbo)"
                                            className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-claude-accent/50"
                                            onKeyDown={(e) => e.key === 'Enter' && handleAddModel()}
                                        />
                                        <button 
                                            onClick={handleAddModel}
                                            className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors"
                                        >
                                            Add
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>

        <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm font-medium transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={handleSave}
            className="px-6 py-2 bg-claude-accent text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity shadow-sm flex items-center gap-2"
          >
            <Check size={16} />
            Save Changes
          </button>
        </div>
      </div>
    </div>
  )
}