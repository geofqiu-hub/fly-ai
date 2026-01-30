import React, { useState, useEffect } from 'react'
import { X, Key, Save, Check, AlertCircle, Loader2, Plus, Trash2, Edit2, User, FolderOpen } from 'lucide-react'

interface Props {
  isOpen: boolean
  onClose: () => void
  onSettingsChanged?: () => void
}

export function SettingsModal({ isOpen, onClose, onSettingsChanged }: Props) {
  const [activeTab, setActiveTab] = useState<'models' | 'agents' | 'tools'>('models')
  const [apiKey, setApiKey] = useState('')
  const [baseUrl, setBaseUrl] = useState('')
  const [geminiModels, setGeminiModels] = useState<any[]>([])
  const [checkStatus, setCheckStatus] = useState<'idle' | 'checking' | 'ok' | 'error'>('idle')
  const [checkMessage, setCheckMessage] = useState<string | null>(null)
  const [geminiModelConfigs, setGeminiModelConfigs] = useState<any[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [agents, setAgents] = useState<any[]>([])
  const [presets, setPresets] = useState<any[]>([])
  const [editingAgent, setEditingAgent] = useState<any | null>(null)
  const [isSavingAgent, setIsSavingAgent] = useState(false)
  const [fileScope, setFileScope] = useState<'workspace' | 'device'>('workspace')
  const [workspacePath, setWorkspacePath] = useState('')
  const [permissionEdit, setPermissionEdit] = useState<'allow' | 'deny'>('deny')
  const [permissionBash, setPermissionBash] = useState<'allow' | 'deny'>('deny')
  const [isSavingTools, setIsSavingTools] = useState(false)
  const [saveStatusTools, setSaveStatusTools] = useState<'idle' | 'success' | 'error'>('idle')

  useEffect(() => {
    const loadSettings = async () => {
      const config = await window.api.getApiConfig('gemini')
      if (config) {
        setApiKey(config.api_key || '')
        setBaseUrl(config.base_url || '')
      }

      const [models, configs] = await Promise.all([
        window.api.getModels('gemini'),
        window.api.getModelConfig('gemini')
      ])
      setGeminiModels(models)
      setGeminiModelConfigs(Array.isArray(configs) ? configs : [])

      const [loadedAgents, loadedPresets, scope, wpath, pEdit, pBash] = await Promise.all([
        window.api.getAgents(),
        window.api.getPresetAgents(),
        window.api.getSetting('file_scope'),
        window.api.getSetting('workspace_path'),
        window.api.getSetting('permission_edit'),
        window.api.getSetting('permission_bash')
      ])
      setAgents(loadedAgents || [])
      setPresets(loadedPresets || [])
      setFileScope(scope === 'device' ? 'device' : 'workspace')
      setWorkspacePath(wpath ?? '')
      setPermissionEdit(pEdit === 'allow' ? 'allow' : 'deny')
      setPermissionBash(pBash === 'allow' ? 'allow' : 'deny')
    }
    if (isOpen) {
      loadSettings()
    }
  }, [isOpen])

  const handleCheckGeminiStatus = async () => {
    if (!apiKey.trim()) {
      setCheckStatus('error')
      setCheckMessage('请先输入 Gemini API Key。')
      return
    }

    setCheckStatus('checking')
    setCheckMessage(null)

    try {
      const result = await window.api.checkGeminiConfig({
        apiKey: apiKey.trim(),
        baseUrl: baseUrl.trim() || undefined
      })

      if (result && result.success) {
        setCheckStatus('ok')
        setCheckMessage('连接成功，可以正常访问 Gemini 接口。')
      } else if (result && result.error === 'NO_API_KEY') {
        setCheckStatus('error')
        setCheckMessage('请先输入 Gemini API Key。')
      } else {
        setCheckStatus('error')
        setCheckMessage('连接失败，请检查 Key、Base URL 或网络。')
      }
    } catch (e) {
      setCheckStatus('error')
      setCheckMessage('检查连接时出现异常。')
    }
  }

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

      // Save Model Mappings & capabilities，根据本地 JSON 配置写入是否支持工具、思考过程等
      for (const model of geminiModels) {
        await window.api.updateModelId({ id: model.id, modelId: model.modelId })
        const configEntry = geminiModelConfigs.find((m: any) => m.modelId === model.modelId)
        const tools = configEntry && typeof configEntry.supportsTools === 'boolean'
          ? configEntry.supportsTools
          : true
        const thinking = configEntry?.capabilities?.thinking === true

        await window.api.updateModelCapabilities({
          id: model.id,
          capabilities: {
            ...(model.capabilities || {}),
            tools,
            thinking
          }
        })
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

  const handleSaveToolsSettings = async () => {
    setIsSavingTools(true)
    setSaveStatusTools('idle')
    try {
      await window.api.saveSetting('file_scope', fileScope)
      await window.api.saveSetting('workspace_path', workspacePath.trim())
      await window.api.saveSetting('permission_edit', permissionEdit)
      await window.api.saveSetting('permission_bash', permissionBash)
      setSaveStatusTools('success')
      onSettingsChanged?.()
      setTimeout(() => setSaveStatusTools('idle'), 2000)
    } catch {
      setSaveStatusTools('error')
      setTimeout(() => setSaveStatusTools('idle'), 3000)
    } finally {
      setIsSavingTools(false)
    }
  }

  // 根据 models 表中当前的 modelId，找出对应 JSON 配置
  const getGeminiOptionsForSlot = (slotName: string) => {
    // 约定：models 表中默认的三条记录 name 分别为 "快速"、"Pro"、"图片"
    const type =
      slotName === '快速' ? 'fast' :
      slotName === 'Pro' ? 'pro' :
      slotName === '图片' ? 'image' :
      'fast'

    return geminiModelConfigs.filter((m: any) => m.type === type && !m.hidden)
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
              <User size={16} />
              智能体
            </button>

            <button
              onClick={() => setActiveTab('tools')}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                activeTab === 'tools'
                  ? 'bg-white shadow-sm text-claude-accent'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <FolderOpen size={16} />
              文件与工具
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
                    <div className="mt-2 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleCheckGeminiStatus}
                        disabled={checkStatus === 'checking' || !apiKey.trim()}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                          checkStatus === 'checking' || !apiKey.trim()
                            ? 'border-gray-200 text-gray-400 bg-gray-50 cursor-not-allowed'
                            : 'border-claude-accent/40 text-claude-accent bg-claude-accent/5 hover:bg-claude-accent/10'
                        }`}
                      >
                        {checkStatus === 'checking' ? (
                          <>
                            <Loader2 size={12} className="animate-spin" />
                            检查中…
                          </>
                        ) : (
                          <>Check Status</>
                        )}
                      </button>
                      {checkStatus === 'ok' && checkMessage && (
                        <span className="text-[11px] text-emerald-600">{checkMessage}</span>
                      )}
                      {checkStatus === 'error' && checkMessage && (
                        <span className="text-[11px] text-red-500">{checkMessage}</span>
                      )}
                    </div>
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
                    <p className="text-xs text-gray-500">
                      为「快速 / Pro / 图片」等选项选择实际使用的 Gemini 模型。模型列表来自内置配置文件。
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {geminiModels.map((model) => (
                      <div key={model.id} className="p-3 bg-gray-50 rounded-lg border border-gray-100 space-y-2">
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">
                          {model.name}
                        </label>
                        <select
                          value={model.modelId}
                          onChange={(e) => handleModelIdChange(model.id, e.target.value)}
                          className="w-full px-3 py-1.5 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-claude-accent/20 text-xs"
                        >
                          {getGeminiOptionsForSlot(model.name).map((opt: any) => (
                            <option key={opt.modelId} value={opt.modelId}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
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

            {/* 文件与工具 Panel */}
            {activeTab === 'tools' && (
              <div className="space-y-8">
                <div>
                  <h3 className="text-base font-medium text-gray-900">文件与工具</h3>
                  <p className="text-xs text-gray-500">控制 AI 文件类工具（read_file、list_dir、grep、glob 等）的访问范围，以及编辑/执行权限。</p>
                </div>

                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium text-gray-800">文件读取范围</h4>
                    <p className="text-xs text-gray-500 mb-2">
                      控制 AI 工具可访问的路径：仅工作区或整个设备。选「整个设备」时支持绝对路径，单文件最大 2MB。
                    </p>
                    <div className="flex gap-4">
                      <label className="inline-flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="file_scope_tools"
                          checked={fileScope === 'workspace'}
                          onChange={() => setFileScope('workspace')}
                          className="text-claude-accent focus:ring-claude-accent"
                        />
                        <span className="text-sm">仅工作区</span>
                      </label>
                      <label className="inline-flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="file_scope_tools"
                          checked={fileScope === 'device'}
                          onChange={() => setFileScope('device')}
                          className="text-claude-accent focus:ring-claude-accent"
                        />
                        <span className="text-sm">整个设备</span>
                      </label>
                    </div>
                    {fileScope === 'device' && (
                      <div className="flex items-start gap-2 p-3 mt-2 bg-amber-50 border border-amber-200 rounded-lg">
                        <AlertCircle className="text-amber-600 mt-0.5 shrink-0" size={16} />
                        <div className="text-xs text-amber-800">
                          <p className="font-medium mb-1">安全提示</p>
                          <p>开启后 AI 可读取设备上任意可读文件（含敏感文件）。请勿在不受信任的对话中开启，并注意单文件 2MB 限制。</p>
                        </div>
                      </div>
                    )}
                    <div className="mt-3">
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">工作区路径（可选）</label>
                      <input
                        type="text"
                        value={workspacePath}
                        onChange={(e) => setWorkspacePath(e.target.value)}
                        placeholder="留空则使用应用启动目录"
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-claude-accent/20 focus:border-claude-accent/50 text-sm font-mono"
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-sm font-medium text-gray-800">编辑与执行权限</h4>
                    <p className="text-xs text-gray-500">
                      控制 AI 是否可修改文件（edit / write）或执行 shell 命令（bash）。默认关闭，开启后命令在工作区根目录执行。
                    </p>
                    <label className="inline-flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={permissionEdit === 'allow'}
                        onChange={(e) => setPermissionEdit(e.target.checked ? 'allow' : 'deny')}
                        className="rounded border-gray-300 text-claude-accent focus:ring-claude-accent"
                      />
                      <span className="text-sm">允许编辑/写入文件（edit、write）</span>
                    </label>
                    <label className="inline-flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={permissionBash === 'allow'}
                        onChange={(e) => setPermissionBash(e.target.checked ? 'allow' : 'deny')}
                        className="rounded border-gray-300 text-claude-accent focus:ring-claude-accent"
                      />
                      <span className="text-sm">允许执行 shell 命令（bash）</span>
                    </label>
                    {(permissionEdit === 'allow' || permissionBash === 'allow') && (
                      <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                        <AlertCircle className="text-amber-600 mt-0.5 shrink-0" size={16} />
                        <div className="text-xs text-amber-800">
                          <p className="font-medium mb-1">安全提示</p>
                          <p>开启后 AI 可在工作区内修改文件或执行任意命令，请仅在可信环境中使用。</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <button
                  onClick={handleSaveToolsSettings}
                  disabled={isSavingTools}
                  className={`flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium transition-all shadow-sm ${
                    isSavingTools
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      : 'bg-claude-accent text-white hover:opacity-90 active:scale-[0.98]'
                  }`}
                >
                  {isSavingTools ? (
                    <>
                      <Loader2 className="animate-spin" size={16} />
                      保存中…
                    </>
                  ) : saveStatusTools === 'success' ? (
                    <>
                      <Check size={16} />
                      已保存
                    </>
                  ) : (
                    <>
                      <Save size={16} />
                      保存设置
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
