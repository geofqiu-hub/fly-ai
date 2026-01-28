import React, { useState, useEffect } from 'react'
import { X, Key, Save, Check, AlertCircle, Loader2, Plus, Trash2, Edit2, User } from 'lucide-react'

interface Props {
  isOpen: boolean
  onClose: () => void
  onSettingsChanged?: () => void
}

export function SettingsModal({ isOpen, onClose, onSettingsChanged }: Props) {
  const [activeTab, setActiveTab] = useState<'models' | 'agents'>('models')
  const [apiKey, setApiKey] = useState('')
  const [baseUrl, setBaseUrl] = useState('')
  const [geminiModels, setGeminiModels] = useState<any[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [agents, setAgents] = useState<any[]>([])
  const [presets, setPresets] = useState<any[]>([])
  const [editingAgent, setEditingAgent] = useState<any | null>(null)
  const [isSavingAgent, setIsSavingAgent] = useState(false)

  useEffect(() => {
    const loadSettings = async () => {
      const config = await window.api.getApiConfig('gemini')
      if (config) {
        setApiKey(config.api_key || '')
        setBaseUrl(config.base_url || '')
      }

      const models = await window.api.getModels()
      setGeminiModels(models)

      const [loadedAgents, loadedPresets] = await Promise.all([
        window.api.getAgents(),
        window.api.getPresetAgents()
      ])
      setAgents(loadedAgents || [])
      setPresets(loadedPresets || [])
    }
    if (isOpen) {
      loadSettings()
    }
  }, [isOpen])

  const handleSaveSettings = async () => {
    setIsSaving(true)
    setSaveStatus('idle')

    try {
      // Save API Config
      await window.api.saveApiConfig({
        provider: 'gemini',
        apiKey: apiKey.trim(),
        baseUrl: baseUrl.trim() || undefined
      })

      // Save Model Mappings
      for (const model of geminiModels) {
        await window.api.updateModelId({ id: model.id, modelId: model.modelId })
      }

      setSaveStatus('success')
      onSettingsChanged?.()
      setTimeout(() => setSaveStatus('idle'), 2000)
    } catch (error) {
      setSaveStatus('error')
      setTimeout(() => setSaveStatus('idle'), 3000)
    } finally {
      setIsSaving(false)
    }
  }

  const handleModelIdChange = (id: string, newModelId: string) => {
    setGeminiModels(prev => prev.map(m => m.id === id ? { ...m, modelId: newModelId } : m))
  }

  const handleEditAgent = (agent: any | null) => {
    if (agent) {
      setEditingAgent({
        id: agent.id,
        name: agent.name || '',
        description: agent.description || '',
        systemPrompt: agent.system_prompt || '',
        avatarColor: agent.avatar_color || '#2563EB',
        temperature: agent.temperature ?? 0.7
      })
    } else {
      setEditingAgent({
        id: undefined,
        name: '',
        description: '',
        systemPrompt: '',
        avatarColor: '#2563EB',
        temperature: 0.7
      })
    }
  }

  const handleSaveAgent = async () => {
    if (!editingAgent) return
    if (!editingAgent.name.trim()) return

    setIsSavingAgent(true)
    try {
      const id = await window.api.saveAgent({
        id: editingAgent.id,
        name: editingAgent.name.trim(),
        description: editingAgent.description.trim(),
        systemPrompt: editingAgent.systemPrompt.trim(),
        avatarColor: editingAgent.avatarColor,
        temperature: Number.isFinite(editingAgent.temperature) ? editingAgent.temperature : 0.7
      })

      const updatedAgents = await window.api.getAgents()
      setAgents(updatedAgents || [])
      setEditingAgent(null)
    } finally {
      setIsSavingAgent(false)
    }
  }

  const handleDeleteAgent = async (agentId: string) => {
    if (!confirm('确定要删除这个智能体吗？')) return
    await window.api.deleteAgent(agentId)
    const updatedAgents = await window.api.getAgents()
    setAgents(updatedAgents || [])
  }

  const handleCreateFromPreset = async (presetId: string) => {
    // 检查是否已存在该预设的智能体
    const existingAgent = agents.find(a => a.id === presetId)
    
    if (existingAgent) {
      // 如果已存在，检查是否与预设配置不同（用户已修改过）
      const preset = presets.find(p => p.id === presetId)
      if (preset) {
        const isModified = 
          existingAgent.name !== preset.name ||
          existingAgent.description !== preset.description ||
          existingAgent.system_prompt !== preset.system_prompt ||
          existingAgent.avatar_color !== preset.avatar_color ||
          (existingAgent.temperature ?? 0.7) !== (preset.temperature ?? 0.7)
        
        if (isModified) {
          // 用户已修改，创建新的智能体而不是覆盖
          const newId = await window.api.createAgentFromPreset(presetId, true) // 传入 true 表示强制创建新实例
          if (newId) {
            const updatedAgents = await window.api.getAgents()
            setAgents(updatedAgents || [])
          }
          return
        }
      }
    }
    
    // 如果不存在或未修改，使用原有逻辑（创建或更新）
    const id = await window.api.createAgentFromPreset(presetId)
    if (id) {
      const updatedAgents = await window.api.getAgents()
      setAgents(updatedAgents || [])
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-[800px] h-[650px] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="flex justify-between items-center p-5 border-b border-gray-100 bg-gray-50/50">
          <h2 className="text-lg font-semibold text-gray-800">Settings</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar Tabs */}
          <div className="w-44 bg-gray-50 border-r border-gray-100 p-2 space-y-1 shrink-0">
            <button
              onClick={() => setActiveTab('models')}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                activeTab === 'models'
                  ? 'bg-white shadow-sm text-claude-accent'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Key size={16} />
              Models & API
            </button>

            <button
              onClick={() => setActiveTab('agents')}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                activeTab === 'agents'
                  ? 'bg-white shadow-sm text-claude-accent'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <span>智能体</span>
            </button>
          </div>

          {/* Content Area */}
          <div className="flex-1 p-6 overflow-y-auto">
            {/* Models Panel */}
            {activeTab === 'models' && (
              <div className="space-y-8">
                {/* API Section */}
                <div className="space-y-4">
                  <div>
                    <h3 className="text-base font-medium text-gray-900">Gemini API Config</h3>
                    <p className="text-xs text-gray-500">配置您的 Google Gemini API 密钥和基础 URL</p>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">API Key</label>
                      <input
                        type="password"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder="输入您的 Gemini API Key"
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-claude-accent/20 focus:border-claude-accent/50 text-sm font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Base URL (可选)
                      </label>
                      <input
                        type="text"
                        value={baseUrl}
                        onChange={(e) => setBaseUrl(e.target.value)}
                        placeholder="默认: https://generativelanguage.googleapis.com"
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-claude-accent/20 focus:border-claude-accent/50 text-sm font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* Model Mappings Section */}
                <div className="space-y-4">
                  <div>
                    <h3 className="text-base font-medium text-gray-900">Model Mappings</h3>
                    <p className="text-xs text-gray-500">自定义快速、思考等选项对应的具体模型 ID</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {geminiModels.map((model) => (
                      <div key={model.id} className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                          {model.name}
                        </label>
                        <input
                          type="text"
                          value={model.modelId}
                          onChange={(e) => handleModelIdChange(model.id, e.target.value)}
                          className="w-full px-3 py-1.5 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-claude-accent/20 text-xs font-mono"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-start gap-2 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <AlertCircle className="text-blue-600 mt-0.5 shrink-0" size={16} />
                  <div className="text-xs text-blue-700">
                    <p className="font-medium mb-1">提示</p>
                    <p>修改模型 ID 后，点击下方保存按钮生效。模型 ID 必须是 Google Gemini 支持的有效标识符。</p>
                  </div>
                </div>

                <button
                  onClick={handleSaveSettings}
                  disabled={isSaving || !apiKey.trim()}
                  className={`flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium transition-all shadow-sm ${
                    isSaving || !apiKey.trim()
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      : 'bg-claude-accent text-white hover:opacity-90 active:scale-[0.98]'
                  }`}
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="animate-spin" size={16} />
                      Saving Changes...
                    </>
                  ) : saveStatus === 'success' ? (
                    <>
                      <Check size={16} />
                      All Settings Saved
                    </>
                  ) : (
                    <>
                      <Save size={16} />
                      Save Settings
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Agents Panel */}
            {activeTab === 'agents' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-medium text-gray-900">智能体管理</h3>
                    <p className="text-xs text-gray-500">创建、编辑和删除可在聊天中通过 # 触发的智能体。</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleEditAgent(null)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-claude-accent text-white hover:opacity-90 transition-colors"
                    >
                      <Plus size={14} />
                      新建智能体
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  {/* Agents list */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">已创建的智能体</h4>
                    </div>
                    {agents.length === 0 ? (
                      <div className="p-4 border border-dashed border-gray-200 rounded-lg text-xs text-gray-400 text-center">
                        还没有智能体。点击“新建智能体”或从预设中快速创建。
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-[360px] overflow-y-auto">
                        {agents.map(agent => (
                          <div
                            key={agent.id}
                            className="flex items-start gap-3 px-3 py-2 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors"
                          >
                            <div
                              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs shrink-0"
                              style={{ backgroundColor: agent.avatar_color || '#2563EB' }}
                            >
                              <User size={14} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <div className="min-w-0">
                                  <div className="text-sm font-medium text-gray-800 truncate">
                                    {agent.name || '未命名智能体'}
                                  </div>
                                  <div className="text-[11px] text-gray-400 truncate">
                                    {agent.description || '暂无描述'}
                                  </div>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                  <button
                                    onClick={() => handleEditAgent(agent)}
                                    className="p-1 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
                                    title="编辑"
                                  >
                                    <Edit2 size={12} />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteAgent(agent.id)}
                                    className="p-1 rounded-md hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                                    title="删除"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Edit / create form + presets */}
                  <div className="space-y-4">
                    <div className="space-y-3">
                      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">编辑智能体</h4>
                      {editingAgent ? (
                        <div className="space-y-3 p-3 border border-gray-100 rounded-lg bg-gray-50/60">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">名称</label>
                            <input
                              type="text"
                              value={editingAgent.name}
                              onChange={(e) => setEditingAgent({ ...editingAgent, name: e.target.value })}
                              className="w-full px-3 py-1.5 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-claude-accent/20"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">描述</label>
                            <input
                              type="text"
                              value={editingAgent.description}
                              onChange={(e) => setEditingAgent({ ...editingAgent, description: e.target.value })}
                              className="w-full px-3 py-1.5 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-claude-accent/20"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">System Prompt</label>
                            <textarea
                              value={editingAgent.systemPrompt}
                              onChange={(e) => setEditingAgent({ ...editingAgent, systemPrompt: e.target.value })}
                              rows={4}
                              className="w-full px-3 py-2 border border-gray-200 rounded-md text-xs font-mono focus:outline-none focus:ring-2 focus:ring-claude-accent/20"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">头像颜色</label>
                              <div className="flex items-center gap-2">
                                <input
                                  type="color"
                                  value={editingAgent.avatarColor}
                                  onChange={(e) => setEditingAgent({ ...editingAgent, avatarColor: e.target.value })}
                                  className="w-10 h-8 border border-gray-200 rounded cursor-pointer"
                                />
                                <input
                                  type="text"
                                  value={editingAgent.avatarColor}
                                  onChange={(e) => setEditingAgent({ ...editingAgent, avatarColor: e.target.value })}
                                  className="flex-1 px-2 py-1 border border-gray-200 rounded text-xs font-mono focus:outline-none focus:ring-1 focus:ring-claude-accent/20"
                                />
                              </div>
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">温度 (0 - 1)</label>
                              <input
                                type="number"
                                min={0}
                                max={1}
                                step={0.1}
                                value={editingAgent.temperature}
                                onChange={(e) => setEditingAgent({ ...editingAgent, temperature: parseFloat(e.target.value) })}
                                className="w-full px-2 py-1.5 border border-gray-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-claude-accent/20"
                              />
                            </div>
                          </div>
                          <div className="flex items-center justify-end gap-2 pt-2">
                            <button
                              type="button"
                              onClick={() => setEditingAgent(null)}
                              className="px-3 py-1.5 text-xs rounded-md border border-gray-200 text-gray-600 hover:bg-gray-100 transition-colors"
                            >
                              取消
                            </button>
                            <button
                              type="button"
                              onClick={handleSaveAgent}
                              disabled={isSavingAgent || !editingAgent.name.trim()}
                              className={`px-4 py-1.5 text-xs rounded-md text-white flex items-center gap-1.5 ${
                                isSavingAgent || !editingAgent.name.trim()
                                  ? 'bg-gray-300 cursor-not-allowed'
                                  : 'bg-claude-accent hover:opacity-90'
                              }`}
                            >
                              {isSavingAgent && <Loader2 size={12} className="animate-spin" />}
                              保存
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="p-4 border border-dashed border-gray-200 rounded-lg text-xs text-gray-400">
                          选择左侧的智能体进行编辑，或点击“新建智能体”开始配置。
                        </div>
                      )}
                    </div>

                    {presets.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">预设智能体</h4>
                        <div className="flex flex-wrap gap-2">
                          {presets.map(preset => (
                            <button
                              key={preset.id}
                              type="button"
                              onClick={() => handleCreateFromPreset(preset.id)}
                              className="px-2.5 py-1 text-[11px] rounded-full border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
                            >
                              {preset.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
