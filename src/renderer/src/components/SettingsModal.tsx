import React from 'react'
import { X, Check, Plus, Bot, Zap, Users } from 'lucide-react'

interface Props {
  isOpen: boolean
  onClose: () => void
  onSettingsChanged?: () => void
}

const AVATAR_COLORS = [
  '#7c3aed', '#3b82f6', '#10b981', '#f59e0b', '#ef4444',
  '#ec4899', '#8b5cf6', '#06b6d4', '#84cc16', '#f97316'
]

export function SettingsModal({ isOpen, onClose, onSettingsChanged }: Props) {
  // TODO: 实现设置状态管理
  const activeTab = 'agents'
  const agents: any[] = []
  const presetAgents: any[] = []
  const isCreatingAgent = false
  const editingAgent: any = null
  const agentName = ''
  const agentDescription = ''
  const agentSystemPrompt = ''
  const agentAvatarColor = '#7c3aed'
  const agentTemperature = 0.7

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-[800px] h-[680px] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">

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
                {/* Models Tab */}
                <button className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 text-gray-600 hover:bg-gray-100">
                    Models
                    <span className="ml-auto text-xs">即将推出</span>
                </button>

                {/* Agents Tab */}
                <button className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 bg-white shadow-sm text-claude-accent">
                    <Bot size={16} />
                    智能体
                    {agents.length > 0 && <div className="w-1.5 h-1.5 rounded-full bg-claude-accent ml-auto" />}
                </button>

                {/* Skills Tab (Disabled) */}
                <button disabled className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 text-gray-400 cursor-not-allowed opacity-60">
                    <Zap size={16} />
                    Skills
                    <span className="ml-auto text-xs">即将推出</span>
                </button>

                {/* Agent Tab (Disabled) */}
                <button disabled className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 text-gray-400 cursor-not-allowed opacity-60">
                    <Users size={16} />
                    Agent
                    <span className="ml-auto text-xs">即将推出</span>
                </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 p-6 overflow-y-auto">
                {/* Agents Panel */}
                {activeTab === 'agents' && (
                    <div className="space-y-6">
                        {/* Header */}
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-base font-medium text-gray-900">智能体管理</h3>
                                <p className="text-xs text-gray-500">创建和自定义 AI 智能体</p>
                            </div>
                            <button className="px-3 py-1.5 bg-claude-accent text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity flex items-center gap-1.5">
                                <Plus size={14} />
                                新建
                            </button>
                        </div>

                        {/* Agent Form */}
                        {(isCreatingAgent || editingAgent) && (
                            <div className="space-y-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                                <div className="flex items-center gap-2">
                                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm" style={{ backgroundColor: agentAvatarColor }}>
                                        <Bot size={18} />
                                    </div>
                                    <div className="flex-1">
                                        <input type="text" value={agentName} placeholder="智能体名称" className="w-full px-2 py-1 border border-gray-200 rounded focus:outline-none focus:border-claude-accent/50 text-sm font-medium" />
                                        <input type="text" value={agentDescription} placeholder="简短描述" className="w-full px-2 py-1 border border-gray-200 rounded focus:outline-none focus:border-claude-accent/50 text-xs mt-1" />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">系统提示词</label>
                                    <textarea value={agentSystemPrompt} placeholder="定义智能体的角色和行为..." rows={3} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-claude-accent/20 focus:border-claude-accent/50 text-sm resize-none" />
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">温度: {agentTemperature}</label>
                                    <input type="range" min="0" max="1" step="0.1" value={agentTemperature} className="w-full" />
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-2">头像颜色</label>
                                    <div className="flex flex-wrap gap-2">
                                        {AVATAR_COLORS.map(color => (
                                            <button key={color} className="w-6 h-6 rounded-full transition-transform hover:scale-110" style={{ backgroundColor: color }} />
                                        ))}
                                    </div>
                                </div>

                                <div className="flex gap-2 pt-2">
                                    <button className="flex-1 px-3 py-1.5 bg-claude-accent text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity">
                                        {editingAgent ? '保存修改' : '创建智能体'}
                                    </button>
                                    <button className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors">
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
                                        <div key={agent.id} className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200">
                                            <div className="w-10 h-10 rounded-full flex items-center justify-center text-white shrink-0" style={{ backgroundColor: agent.avatar_color }}>
                                                <Bot size={18} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="font-medium text-sm text-gray-900 truncate">{agent.name}</div>
                                                <div className="text-xs text-gray-500 truncate">{agent.description || '无描述'}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Preset Agents */}
                        {presetAgents.length > 0 && (
                            <div>
                                <h4 className="text-xs font-medium text-gray-700 mb-2">预设模板</h4>
                                <div className="space-y-2">
                                    {presetAgents.map(agent => (
                                        <div key={agent.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                                            <div className="w-10 h-10 rounded-full flex items-center justify-center text-white shrink-0" style={{ backgroundColor: agent.avatar_color }}>
                                                <Bot size={18} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="font-medium text-sm text-gray-900 truncate">{agent.name}</div>
                                                <div className="text-xs text-gray-500 truncate">{agent.description}</div>
                                            </div>
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
          <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm font-medium transition-colors">
            Cancel
          </button>
          <button className="px-6 py-2 bg-claude-accent text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity shadow-sm flex items-center gap-2">
            <Check size={16} />
            Save Changes
          </button>
        </div>
      </div>
    </div>
  )
}
