import React, { useState, useEffect } from 'react'
import { X, Save, Check, Plus, Trash2, Bot, Edit2, Copy, Sparkles, Cpu, Zap, Users } from 'lucide-react'
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

const AVATAR_COLORS = [
  '#7c3aed', '#3b82f6', '#10b981', '#f59e0b', '#ef4444',
  '#ec4899', '#8b5cf6', '#06b6d4', '#84cc16', '#f97316'
]

interface Agent {
  id: string
  name: string
  description: string
  system_prompt: string
  avatar_color: string
  model_id?: string
  temperature?: number
  is_preset?: number
  created_at?: number
  updated_at?: number
}

export function SettingsModal({ isOpen, onClose, onSettingsChanged }: Props) {
  const [activeTab, setActiveTab] = useState<'models' | 'agents' | 'skills' | 'agent'>('models')
  const [modelSubTab, setModelSubTab] = useState<'gemini' | 'openai'>('gemini')

  // Gemini/OpenAI Settings
  const [geminiKey, setGeminiKey] = useState('')
  const [openaiKey, setOpenaiKey] = useState('')
  const [geminiBaseUrl, setGeminiBaseUrl] = useState('')
  const [openaiBaseUrl, setOpenaiBaseUrl] = useState('')

  const [geminiEnabled, setGeminiEnabled] = useState(true)
  const [openaiEnabled, setOpenaiEnabled] = useState(false)

  const [geminiModels, setGeminiModels] = useState<string[]>([])
  const [openaiModels, setOpenaiModels] = useState<string[]>([])
  const [newModelInput, setNewModelInput] = useState('')

  // Agent Settings
  const [agents, setAgents] = useState<Agent[]>([])
  const [presetAgents, setPresetAgents] = useState<Agent[]>([])
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null)
  const [isCreatingAgent, setIsCreatingAgent] = useState(false)

  // Agent Form State
  const [agentName, setAgentName] = useState('')
  const [agentDescription, setAgentDescription] = useState('')
  const [agentSystemPrompt, setAgentSystemPrompt] = useState('')
  const [agentAvatarColor, setAgentAvatarColor] = useState('#7c3aed')
  const [agentTemperature, setAgentTemperature] = useState(0.7)

  useEffect(() => {
    if (isOpen) {
      loadSettings()
      setActiveTab('models') // Reset to models tab when opening
      if (activeTab === 'agents') {
        loadAgents()
      }
    }
  }, [isOpen])

  useEffect(() => {
    if (isOpen && activeTab === 'agents') {
      loadAgents()
    }
  }, [activeTab])

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

  const loadAgents = async () => {
    const customAgents = await window.api.getAgents()
    const presets = await window.api.getPresetAgents()
    setAgents(customAgents)
    setPresetAgents(presets)
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

      if (modelSubTab === 'gemini') {
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
      if (modelSubTab === 'gemini') {
          setGeminiModels(geminiModels.filter(m => m !== model))
      } else {
          setOpenaiModels(openaiModels.filter(m => m !== model))
      }
  }

  // Agent Handlers
  const handleCreateAgent = () => {
    setEditingAgent(null)
    setIsCreatingAgent(true)
    setAgentName('')
    setAgentDescription('')
    setAgentSystemPrompt('')
    setAgentAvatarColor('#7c3aed')
    setAgentTemperature(0.7)
  }

  const handleEditAgent = (agent: Agent) => {
    setEditingAgent(agent)
    setIsCreatingAgent(false)
    setAgentName(agent.name)
    setAgentDescription(agent.description || '')
    setAgentSystemPrompt(agent.system_prompt || '')
    setAgentAvatarColor(agent.avatar_color || '#7c3aed')
    setAgentTemperature(agent.temperature || 0.7)
  }

  const handleSaveAgent = async () => {
    if (!agentName.trim()) return

    await window.api.saveAgent({
      id: editingAgent?.id,
      name: agentName.trim(),
      description: agentDescription.trim(),
      systemPrompt: agentSystemPrompt.trim(),
      avatarColor: agentAvatarColor,
      temperature: agentTemperature,
      isPreset: false
    })

    await loadAgents()
    setIsCreatingAgent(false)
    setEditingAgent(null)
  }

  const handleDeleteAgent = async (agentId: string) => {
    if (confirm('确定要删除这个智能体吗？')) {
      const success = await window.api.deleteAgent(agentId)
      if (success) {
        await loadAgents()
      } else {
        alert('无法删除预设智能体')
      }
    }
  }

  const handleDuplicateFromPreset = async (presetId: string) => {
    const newAgentId = await window.api.createAgentFromPreset(presetId)
    if (newAgentId) {
      await loadAgents()
    }
  }

  const handleCancelAgentEdit = () => {
    setIsCreatingAgent(false)
    setEditingAgent(null)
  }

  // Reset all input states when closing
  const handleClose = () => {
    // Reset all input states
    setAgentName('')
    setAgentDescription('')
    setAgentSystemPrompt('')
    setAgentAvatarColor('#7c3aed')
    setAgentTemperature(0.7)
    setIsCreatingAgent(false)
    setEditingAgent(null)
    setNewModelInput('')
    setActiveTab('models')
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-[800px] h-[680px] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">

        {/* Header */}
        <div className="flex justify-between items-center p-5 border-b border-gray-100 bg-gray-50/50">
          <h2 className="text-lg font-semibold text-gray-800">Settings</h2>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
            {/* Sidebar Tabs */}
            <div className="w-44 bg-gray-50 border-r border-gray-100 p-2 space-y-1 shrink-0">
                {/* Models - Parent Tab */}
                <div>
                    <button
                        onClick={() => setActiveTab('models')}
                        className={clsx(
                            "w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 mb-1",
                            activeTab === 'models' ? "bg-white shadow-sm text-claude-accent" : "text-gray-600 hover:bg-gray-100"
                        )}
                    >
                        <Cpu size={16} />
                        模型
                        <div className="ml-auto flex gap-1">
                            {geminiEnabled && <div className="w-1.5 h-1.5 rounded-full bg-green-500" />}
                            {openaiEnabled && <div className="w-1.5 h-1.5 rounded-full bg-green-500" />}
                        </div>
                    </button>

                    {/* Sub Tabs - Only show when models tab is active */}
                    {activeTab === 'models' && (
                        <div className="ml-2 space-y-1 animate-in slide-in-from-left-1 duration-150">
                            <button
                                onClick={() => setModelSubTab('gemini')}
                                className={clsx(
                                    "w-full text-left px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-2",
                                    modelSubTab === 'gemini' ? "bg-white text-claude-accent" : "text-gray-500 hover:bg-gray-100/50"
                                )}
                            >
                                Gemini
                                {geminiEnabled && <div className="w-1 h-1 rounded-full bg-green-500 ml-auto" />}
                            </button>
                            <button
                                onClick={() => setModelSubTab('openai')}
                                className={clsx(
                                    "w-full text-left px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-2",
                                    modelSubTab === 'openai' ? "bg-white text-claude-accent" : "text-gray-500 hover:bg-gray-100/50"
                                )}
                            >
                                OpenAI
                                {openaiEnabled && <div className="w-1 h-1 rounded-full bg-green-500 ml-auto" />}
                            </button>
                        </div>
                    )}
                </div>

                {/* Agents Tab */}
                <button
                    onClick={() => setActiveTab('agents')}
                    className={clsx(
                        "w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2",
                        activeTab === 'agents' ? "bg-white shadow-sm text-claude-accent" : "text-gray-600 hover:bg-gray-100"
                    )}
                >
                    <Bot size={16} />
                    智能体
                    {agents.length > 0 && <div className="w-1.5 h-1.5 rounded-full bg-claude-accent ml-auto" />}
                </button>

                {/* Skills Tab (Disabled) */}
                <button
                    disabled
                    className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 text-gray-400 cursor-not-allowed opacity-60"
                    title="即将推出"
                >
                    <Zap size={16} />
                    Skills
                    <span className="ml-auto text-xs">即将推出</span>
                </button>

                {/* Agent Tab (Disabled) */}
                <button
                    disabled
                    className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 text-gray-400 cursor-not-allowed opacity-60"
                    title="即将推出"
                >
                    <Users size={16} />
                    Agent
                    <span className="ml-auto text-xs">即将推出</span>
                </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 p-6 overflow-y-auto">

                {/* Models Panel */}
                {activeTab === 'models' && (
                    <div className="space-y-6">
                        {/* Gemini Sub Panel */}
                        {modelSubTab === 'gemini' && (
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

                        {/* OpenAI Sub Panel */}
                        {modelSubTab === 'openai' && (
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
                )}

                {/* Agents Panel */}
                {activeTab === 'agents' && (
                    <div className="space-y-6">
                        {/* Header */}
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-base font-medium text-gray-900">智能体管理</h3>
                                <p className="text-xs text-gray-500">创建和自定义 AI 智能体</p>
                            </div>
                            <button
                                onClick={handleCreateAgent}
                                className="px-3 py-1.5 bg-claude-accent text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity flex items-center gap-1.5"
                            >
                                <Plus size={14} />
                                新建
                            </button>
                        </div>

                        {/* Agent Form */}
                        {(isCreatingAgent || editingAgent) && (
                            <div className="space-y-4 p-4 bg-gray-50 rounded-lg border border-gray-200 animate-in slide-in-from-top-2 duration-200">
                                <div className="flex items-center gap-2">
                                    <div
                                        className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm"
                                        style={{ backgroundColor: agentAvatarColor }}
                                    >
                                        <Bot size={18} />
                                    </div>
                                    <div className="flex-1">
                                        <input
                                            type="text"
                                            value={agentName}
                                            onChange={(e) => setAgentName(e.target.value)}
                                            placeholder="智能体名称"
                                            className="w-full px-2 py-1 border border-gray-200 rounded focus:outline-none focus:border-claude-accent/50 text-sm font-medium"
                                        />
                                        <input
                                            type="text"
                                            value={agentDescription}
                                            onChange={(e) => setAgentDescription(e.target.value)}
                                            placeholder="简短描述"
                                            className="w-full px-2 py-1 border border-gray-200 rounded focus:outline-none focus:border-claude-accent/50 text-xs mt-1"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">系统提示词</label>
                                    <textarea
                                        value={agentSystemPrompt}
                                        onChange={(e) => setAgentSystemPrompt(e.target.value)}
                                        placeholder="定义智能体的角色和行为..."
                                        rows={3}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-claude-accent/20 focus:border-claude-accent/50 text-sm resize-none"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">温度: {agentTemperature}</label>
                                    <input
                                        type="range"
                                        min="0"
                                        max="1"
                                        step="0.1"
                                        value={agentTemperature}
                                        onChange={(e) => setAgentTemperature(parseFloat(e.target.value))}
                                        className="w-full"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-2">头像颜色</label>
                                    <div className="flex flex-wrap gap-2">
                                        {AVATAR_COLORS.map(color => (
                                            <button
                                                key={color}
                                                onClick={() => setAgentAvatarColor(color)}
                                                className={clsx(
                                                    "w-6 h-6 rounded-full transition-transform hover:scale-110",
                                                    agentAvatarColor === color ? "ring-2 ring-offset-2 ring-gray-400" : ""
                                                )}
                                                style={{ backgroundColor: color }}
                                            />
                                        ))}
                                    </div>
                                </div>

                                <div className="flex gap-2 pt-2">
                                    <button
                                        onClick={handleSaveAgent}
                                        className="flex-1 px-3 py-1.5 bg-claude-accent text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
                                    >
                                        {editingAgent ? '保存修改' : '创建智能体'}
                                    </button>
                                    <button
                                        onClick={handleCancelAgentEdit}
                                        className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors"
                                    >
                                        取消
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Custom Agents */}
                        {agents.length > 0 && (
                            <div>
                                <h4 className="text-xs font-medium text-gray-700 mb-2">我的智能体</h4>
                                <div className="space-y-2">
                                    {agents.map(agent => (
                                        <div key={agent.id} className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200 hover:border-claude-accent/50 transition-colors">
                                            <div
                                                className="w-10 h-10 rounded-full flex items-center justify-center text-white shrink-0"
                                                style={{ backgroundColor: agent.avatar_color }}
                                            >
                                                <Bot size={18} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="font-medium text-sm text-gray-900 truncate">{agent.name}</div>
                                                <div className="text-xs text-gray-500 truncate">{agent.description || '无描述'}</div>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <button
                                                    onClick={() => handleEditAgent(agent)}
                                                    className="p-1.5 text-gray-400 hover:text-claude-accent hover:bg-gray-100 rounded-lg transition-colors"
                                                >
                                                    <Edit2 size={14} />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteAgent(agent.id)}
                                                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-gray-100 rounded-lg transition-colors"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Preset Agents */}
                        {presetAgents.length > 0 && (
                            <div>
                                <h4 className="text-xs font-medium text-gray-700 mb-2 flex items-center gap-1">
                                    <Sparkles size={12} />
                                    预设模板
                                </h4>
                                <div className="space-y-2">
                                    {presetAgents.map(agent => (
                                        <div key={agent.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                                            <div
                                                className="w-10 h-10 rounded-full flex items-center justify-center text-white shrink-0"
                                                style={{ backgroundColor: agent.avatar_color }}
                                            >
                                                <Bot size={18} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="font-medium text-sm text-gray-900 truncate">{agent.name}</div>
                                                <div className="text-xs text-gray-500 truncate">{agent.description}</div>
                                            </div>
                                            <button
                                                onClick={() => handleDuplicateFromPreset(agent.id)}
                                                className="p-1.5 text-gray-400 hover:text-claude-accent hover:bg-white rounded-lg transition-colors"
                                                title="复制为自定义智能体"
                                            >
                                                <Copy size={14} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
          <button
            onClick={handleClose}
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
