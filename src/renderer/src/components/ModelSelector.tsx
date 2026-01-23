import React, { useState, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'
import clsx from 'clsx'
import type { Model } from '../types/chat'

interface Props {
  selectedModelId?: string | null
  onSelectModel: (model: Model | null) => void
  models?: Model[]
  disabled?: boolean
}

export function ModelSelector({ selectedModelId, onSelectModel, models = [], disabled = false }: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const [loadedModels, setLoadedModels] = useState<Model[]>([])

  useEffect(() => {
    const loadModels = async () => {
      try {
        const allModels = await window.api.getModels()
        setLoadedModels(allModels)
      } catch (error) {
        console.error('Failed to load models:', error)
      }
    }
    loadModels()
  }, [])

  const displayModels = models.length > 0 ? models : loadedModels
  const selectedModel = displayModels.find(m => m.modelId === selectedModelId)

  return (
    <div className="relative">
      <button
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={clsx(
          "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border border-black/5",
          disabled 
            ? "bg-gray-50 text-gray-400 cursor-not-allowed border-transparent" 
            : "bg-gray-100/80 text-gray-700 hover:bg-gray-200/80"
        )}
        title={disabled ? "Cannot change model once conversation has started" : undefined}
      >
        <span className="truncate max-w-[150px]">{selectedModel?.name || 'Select Model'}</span>
        {!disabled && <ChevronDown size={14} className={clsx("transition-transform duration-200", isOpen && "rotate-180")} />}
      </button>

      {isOpen && !disabled && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute bottom-full left-0 mb-2 bg-white rounded-xl shadow-xl border border-black/5 p-1 z-20 w-auto min-w-[200px] flex flex-col gap-0.5">
            {displayModels.map(model => (
              <button
                key={model.id}
                onClick={() => {
                  onSelectModel(model)
                  setIsOpen(false)
                }}
                className={clsx(
                  "w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-all flex items-center justify-between whitespace-nowrap",
                  model.modelId === selectedModelId 
                    ? "bg-gray-100 text-claude-accent font-semibold" 
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                )}
              >
                <span className="mr-4">{model.name}</span>
                {model.modelId === selectedModelId && (
                  <div className="w-1.5 h-1.5 rounded-full bg-claude-accent shrink-0" />
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export default ModelSelector

