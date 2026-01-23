import React, { useState, useEffect } from 'react'
import { X, Key, Save, Check, AlertCircle, Loader2 } from 'lucide-react'

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

  useEffect(() => {
    const loadSettings = async () => {
      const config = await window.api.getApiConfig('gemini')
      if (config) {
        setApiKey(config.api_key || '')
        setBaseUrl(config.base_url || '')
      }

      const models = await window.api.getModels()
      setGeminiModels(models)
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

            {/* Agents Panel (placeholder) */}
            {activeTab === 'agents' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-base font-medium text-gray-900">智能体管理</h3>
                  <p className="text-xs text-gray-500">创建和自定义 AI 智能体</p>
                </div>

                <div className="p-8 text-center border-2 border-dashed border-gray-200 rounded-lg">
                  <p className="text-gray-400 text-sm">智能体功能开发中...</p>
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
