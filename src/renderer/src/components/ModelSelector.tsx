import React, { useState, useRef, useEffect } from 'react'
import { ChevronDown, Check } from 'lucide-react'
import clsx from 'clsx'

interface Model {
    id: string
    name: string
    provider: 'gemini' | 'openai'
}

interface Props {
    selectedModelId: string
    onSelectModel: (id: string) => void
    enabledProviders: { gemini: boolean, openai: boolean }
    availableModels: { gemini: string[], openai: string[] }
}

export function ModelSelector({ selectedModelId, onSelectModel, enabledProviders, availableModels }: Props) {
    const [isOpen, setIsOpen] = useState(false)
    const containerRef = useRef<HTMLDivElement>(null)

    // Build flat list of available models
    const activeModels: Model[] = []
    
    if (enabledProviders.gemini) {
        availableModels.gemini.forEach(id => {
            activeModels.push({ id, name: id, provider: 'gemini' })
        })
    }
    
    if (enabledProviders.openai) {
        availableModels.openai.forEach(id => {
             activeModels.push({ id, name: id, provider: 'openai' })
        })
    }

    const currentModel = activeModels.find(m => m.id === selectedModelId) || activeModels[0]

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    if (activeModels.length === 0) return null

    return (
        <div className="relative" ref={containerRef}>
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-gray-800 transition-colors px-2 py-1 rounded hover:bg-gray-100 max-w-[150px]"
                title={currentModel?.name || 'Select Model'}
            >
                <span className="truncate">{currentModel?.name || 'Select Model'}</span>
                <ChevronDown size={12} className="shrink-0" />
            </button>

            {isOpen && (
                <div className="absolute bottom-full left-0 mb-2 w-56 bg-white rounded-lg shadow-xl border border-gray-100 py-1 overflow-hidden z-20 animate-in fade-in zoom-in-95 duration-100">
                    <div className="max-h-60 overflow-y-auto">
                        {activeModels.map(model => (
                            <button
                                key={model.id}
                                onClick={() => {
                                    onSelectModel(model.id)
                                    setIsOpen(false)
                                }}
                                className="w-full text-left px-3 py-2 text-sm flex items-center justify-between hover:bg-gray-50 transition-colors group"
                            >
                                <div className="flex flex-col">
                                    <span className={clsx(
                                        "truncate",
                                        model.id === selectedModelId ? "text-claude-accent font-medium" : "text-gray-700"
                                    )}>
                                        {model.name}
                                    </span>
                                    <span className="text-[10px] text-gray-400 uppercase tracking-wider">{model.provider}</span>
                                </div>
                                {model.id === selectedModelId && <Check size={14} className="text-claude-accent shrink-0" />}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}