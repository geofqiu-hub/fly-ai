import React from 'react'
import { AlertCircle, Info, CheckCircle, XCircle, Loader2 } from 'lucide-react'

interface Props {
  enabled: boolean
  autoCompactTokenLimit: number
  preserveTurns: number
  compactionModel: string | null
  compactionModelCost?: number
  isModelAvailable: boolean
  isDetecting?: boolean
  onToggle: (enabled: boolean) => void
  onConfigChange: (config: any) => void
  onSelectModel: (modelId: string) => void
  onDetectModel: () => Promise<void>
}

export function CompactionSettings({
  enabled,
  autoCompactTokenLimit,
  preserveTurns,
  compactionModel,
  compactionModelCost,
  isModelAvailable,
  isDetecting = false,
  onToggle,
  onConfigChange,
  onSelectModel,
  onDetectModel
}: Props) {
  
  const [showDetails, setShowDetails] = React.useState(false)
  
  const advantages = [
    '节省 API 成本 - 长对话可节省 50-80% tokens',
    '避免超出模型上下文限制',
    '提高响应速度 - 上下文更小',
    '保留关键信息，不会丢失对话历史',
    '智能 8 段式摘要，确保重要信息不丢失'
  ]
  
  const disadvantages = [
    '压缩本身消耗额外的 API 调用',
    '细节可能略有损失',
    '压缩过程需要等待时间（通常 1-3 秒）',
    '如果压缩模型质量差，可能丢失重要上下文',
    '首次压缩可能不熟悉摘要格式'
  ]
  
  return (
    <div className="space-y-6">
      {/* 主开关 */}
      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${enabled ? 'bg-green-100 text-green-600' : 'bg-gray-200 text-gray-500'}`}>
            {enabled ? <CheckCircle size={20} /> : <XCircle size={20} />}
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">开启对话压缩</h3>
            <p className="text-sm text-gray-500">
              {enabled ? '对话压缩已启用' : '对话压缩已关闭（默认）'}
            </p>
          </div>
        </div>
        
        <button
          onClick={() => onToggle(!enabled)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            enabled ? 'bg-claude-accent' : 'bg-gray-300'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              enabled ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>
      
      {/* 模型可用性警告 */}
      {!isModelAvailable && (
        <div className="flex items-start gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <AlertCircle className="text-yellow-600 mt-0.5" size={18} />
          <div className="flex-1">
            <h4 className="font-medium text-yellow-800">未检测到可用的压缩模型</h4>
            <p className="text-sm text-yellow-700 mt-1">
              当前 API Key 可能不支持 Gemini 1.x 系列模型。请点击下方按钮检测可用模型。
            </p>
            <button
              onClick={onDetectModel}
              disabled={isDetecting}
              className="mt-2 px-4 py-2 bg-yellow-100 hover:bg-yellow-200 text-yellow-800 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {isDetecting ? (
                <>
                  <Loader2 className="animate-spin" size={14} />
                  检测中...
                </>
              ) : (
                '检测可用模型'
              )}
            </button>
          </div>
        </div>
      )}
      
      {/* 已选择的压缩模型信息 */}
      {compactionModel && isModelAvailable && (
        <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
          <CheckCircle className="text-green-600" size={18} />
          <div className="flex-1">
            <h4 className="font-medium text-green-800">当前压缩模型</h4>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm font-mono text-green-700 bg-green-100 px-2 py-0.5 rounded">
                {compactionModel}
              </span>
              {compactionModelCost && (
                <span className="text-xs text-green-600">
                  估算成本: ${(compactionModelCost * 1000).toFixed(4)} / 1k tokens
                </span>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* 详细配置（仅在启用时显示） */}
      {enabled && (
        <div className="space-y-4 pt-4 border-t border-gray-200">
          
          {/* Token 阈值 */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-medium text-gray-700">
                自动压缩阈值
              </label>
              <span className="text-sm text-gray-500">
                {autoCompactTokenLimit.toLocaleString()} tokens
              </span>
            </div>
            <input
              type="range"
              min={50000}
              max={200000}
              step={10000}
              value={autoCompactTokenLimit}
              onChange={(e) => onConfigChange({ autoCompactTokenLimit: parseInt(e.target.value) })}
              className="w-full"
            />
            <p className="text-xs text-gray-500 mt-1">
              当对话超过此 token 数时自动触发压缩
            </p>
          </div>
          
          {/* 保留轮次数 */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-medium text-gray-700">
                保留最近轮次
              </label>
              <span className="text-sm text-gray-500">{preserveTurns} 轮</span>
            </div>
            <input
              type="range"
              min={1}
              max={5}
              step={1}
              value={preserveTurns}
              onChange={(e) => onConfigChange({ preserveTurns: parseInt(e.target.value) })}
              className="w-full"
            />
            <p className="text-xs text-gray-500 mt-1">
              压缩时保留最近的 N 个完整对话轮次
            </p>
          </div>
        </div>
      )}
      
      {/* 优势和劣势切换 */}
      <button
        onClick={() => setShowDetails(!showDetails)}
        className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
      >
        <Info size={16} />
        {showDetails ? '隐藏' : '查看'}优势和劣势
      </button>
      
      {/* 优势和劣势详情 */}
      {showDetails && (
        <div className="pt-4 border-t border-gray-200 space-y-4">
          
          {/* 优势 */}
          <div className="p-4 bg-green-50 rounded-lg border border-green-200">
            <h4 className="font-semibold text-green-800 mb-2 flex items-center gap-2">
              <CheckCircle size={18} />
              优势
            </h4>
            <ul className="space-y-1">
              {advantages.map((advantage, i) => (
                <li key={i} className="text-sm text-green-700 flex items-start gap-2">
                  <span className="text-green-500 mt-0.5">•</span>
                  {advantage}
                </li>
              ))}
            </ul>
          </div>
          
          {/* 劣势 */}
          <div className="p-4 bg-red-50 rounded-lg border border-red-200">
            <h4 className="font-semibold text-red-800 mb-2 flex items-center gap-2">
              <AlertCircle size={18} />
              劣势
            </h4>
            <ul className="space-y-1">
              {disadvantages.map((disadvantage, i) => (
                <li key={i} className="text-sm text-red-700 flex items-start gap-2">
                  <span className="text-red-500 mt-0.5">•</span>
                  {disadvantage}
                </li>
              ))}
            </ul>
          </div>
          
        </div>
      )}
      
    </div>
  )
}

export default CompactionSettings
