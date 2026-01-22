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
  const [isSaving, setIsSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle')

  useEffect(() => {
    const loadApiKey = async () => {
      const config = await window.api.getApiConfig('gemini')
      if (config) {
        setApiKey(config.api_key || '')
        setBaseUrl(config.base_url || '')
      }
    }
    loadApiKey()
  }, [])

  const handleSaveApiKey = async () => {
    if (!apiKey.trim()) return

    setIsSaving(true)
    setSaveStatus('idle')

    try {
      await window.api.saveApiConfig({
        provider: 'gemini',
        apiKey: apiKey.trim(),
        baseUrl: baseUrl.trim() || undefined
      })
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
              API Keys
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
              <div className="space-y-6">
                <div>
                  <h3 className="text-base font-medium text-gray-900">Gemini API Key</h3>
                  <p className="text-xs text-gray-500">配置您的 Google Gemini API 密钥以使用 AI 功能</p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">API Key</label>
                    <input
                      type="password"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="输入您的 Gemini API Key"
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-claude-accent/20 focus:border-claude-accent/50 text-sm font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Base URL (可选)
                    </label>
                    <input
                      type="text"
                      value={baseUrl}
                      onChange={(e) => setBaseUrl(e.target.value)}
                      placeholder="默认: https://generativelanguage.googleapis.com"
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-claude-accent/20 focus:border-claude-accent/50 text-sm font-mono"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      如果您使用代理，请在此输入代理的基础 URL
                    </p>
                  </div>

                  <div className="flex items-start gap-2 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <AlertCircle className="text-blue-600 mt-0.5 shrink-0" size={16} />
                    <div className="text-xs text-blue-700">
                      <p className="font-medium mb-1">如何获取 API Key？</p>
                      <p>1. 访问 <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="underline">Google AI Studio</a></p>
                      <p>2. 登录您的 Google 账户</p>
                      <p>3. 点击 "Create API Key" 创建密钥</p>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleSaveApiKey}
                  disabled={isSaving || !apiKey.trim()}
                  className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    isSaving || !apiKey.trim()
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      : 'bg-claude-accent text-white hover:opacity-90'
                  }`}
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="animate-spin" size={16} />
                      保存中...
                    </>
                  ) : saveStatus === 'success' ? (
                    <>
                      <Check size={16} />
                      已保存
                    </>
                  ) : (
                    <>
                      <Save size={16} />
                      保存 API Key
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
