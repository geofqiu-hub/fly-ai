import { Provider, Model } from '../providers/base'

export const PROVIDER_MODEL_CAPABILITIES: Record<string, any> = {
  gemini: {
    models: {
      'gemini-2.0-flash-exp': { available: true, isCompact: true, cost: 0.000001, speed: 'fast' },
      'gemini-1.5-pro': { available: true, isCompact: false, cost: 0.0000025, speed: 'medium' },
      'gemini-1.5-flash': { available: true, isCompact: true, cost: 0.00000015, speed: 'fast' },
      'gemini-1.5-flash-8b': { available: true, isCompact: true, cost: 0.0000000375, speed: 'fast' },
    },
    compactionPriority: [
      'gemini-1.5-flash-8b',
      'gemini-2.0-flash-exp',
      'gemini-1.5-flash'
    ]
  },
  
  openai: {
    models: {
      'gpt-4o': { available: true, isCompact: false, cost: 0.000005, speed: 'medium' },
      'gpt-4o-mini': { available: true, isCompact: true, cost: 0.00000015, speed: 'fast' },
      'gpt-4-turbo': { available: true, isCompact: false, cost: 0.00001, speed: 'medium' },
      'gpt-3.5-turbo': { available: true, isCompact: true, cost: 0.0000005, speed: 'fast' },
    },
    compactionPriority: [
      'gpt-4o-mini',
      'gpt-3.5-turbo'
    ]
  },
  
  glm: {
    models: {
      'glm-4': { available: true, isCompact: false, cost: 0.00001, speed: 'medium' },
      'glm-4-flash': { available: true, isCompact: true, cost: 0.0000001, speed: 'fast' },
      'glm-3-turbo': { available: true, isCompact: true, cost: 0.0000005, speed: 'fast' },
    },
    compactionPriority: [
      'glm-4-flash',
      'glm-3-turbo'
    ]
  },
  
  qwen: {
    models: {
      'qwen-max': { available: true, isCompact: false, cost: 0.00002, speed: 'medium' },
      'qwen-plus': { available: true, isCompact: false, cost: 0.000004, speed: 'medium' },
      'qwen-turbo': { available: true, isCompact: true, cost: 0.0000008, speed: 'fast' },
    },
    compactionPriority: [
      'qwen-turbo'
    ]
  }
}

export interface CompactionModelResult {
  success: boolean
  reason?: string
  suggestedModel: CompactionModel | null
}

export interface CompactionModel {
  id: string
  provider: string
  cost: number
  speed: 'fast' | 'medium' | 'slow'
  isDedicated: boolean
  warning?: string
}

export class CompactionModelSelector {
  async selectCompactionModel(
    provider: string,
    apiKey: string,
    mainModel?: string
  ): Promise<CompactionModelResult> {
    
    const providerConfig = PROVIDER_MODEL_CAPABILITIES[provider]
    if (!providerConfig) {
      return {
        success: false,
        reason: `Unsupported provider: ${provider}`,
        suggestedModel: null
      }
    }
    
    const availableModels = await this.detectAvailableModels(provider, apiKey)
    
    if (availableModels.length === 0) {
      return {
        success: false,
        reason: 'No models available with current API key',
        suggestedModel: null
      }
    }
    
    for (const modelId of providerConfig.compactionPriority) {
      const modelConfig = providerConfig.models[modelId]
      
      if (availableModels.includes(modelId) && modelConfig.available) {
        return {
          success: true,
          suggestedModel: {
            id: modelId,
            provider,
            cost: modelConfig.cost,
            speed: modelConfig.speed,
            isDedicated: modelConfig.isCompact
          }
        }
      }
    }
    
    if (mainModel && availableModels.includes(mainModel)) {
      const mainModelConfig = providerConfig.models[mainModel]
      return {
        success: true,
        suggestedModel: {
          id: mainModel,
          provider,
          cost: mainModelConfig.cost,
          speed: mainModelConfig.speed,
          isDedicated: false,
          warning: 'Using main model for compression (may be more expensive)'
        }
      }
    }
    
    const fallbackModel = availableModels[0]
    const fallbackConfig = providerConfig.models[fallbackModel]
    return {
      success: true,
      suggestedModel: {
        id: fallbackModel,
        provider,
        cost: fallbackConfig.cost,
        speed: fallbackConfig.speed,
        isDedicated: false,
        warning: 'Using fallback model for compression'
      }
    }
  }
  
  private async detectAvailableModels(provider: string, apiKey: string): Promise<string[]> {
    try {
      switch (provider) {
        case 'gemini':
          return await this.detectGeminiModels(apiKey)
        case 'openai':
          return await this.detectOpenAIModels(apiKey)
        case 'glm':
          return this.detectGLMModels(apiKey)
        case 'qwen':
          return this.detectQwenModels(apiKey)
        default:
          return []
      }
    } catch (error) {
      console.error(`Failed to detect models for ${provider}:`, error)
      return []
    }
  }
  
  private async detectGeminiModels(apiKey: string): Promise<string[]> {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
      )
      const data = await response.json()
      
      if (data.models) {
        return data.models
          .map((m: any) => m.name.replace('models/', ''))
          .filter((name: string) => name.startsWith('gemini-'))
      }
    } catch (error) {
      console.error('Failed to detect Gemini models:', error)
    }
    
    return [
      'gemini-2.0-flash-exp',
      'gemini-1.5-pro',
      'gemini-1.5-flash',
      'gemini-1.5-flash-8b'
    ]
  }
  
  private async detectOpenAIModels(apiKey: string): Promise<string[]> {
    try {
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: { Authorization: `Bearer ${apiKey}` }
      })
      const data = await response.json()
      
      if (data.data) {
        return data.data.map((m: any) => m.id)
      }
    } catch (error) {
      console.error('Failed to detect OpenAI models:', error)
    }
    
    return ['gpt-4o', 'gpt-4o-mini', 'gpt-3.5-turbo']
  }
  
  private async detectGLMModels(apiKey: string): Promise<string[]> {
    return ['glm-4', 'glm-4-flash', 'glm-3-turbo']
  }
  
  private async detectQwenModels(apiKey: string): Promise<string[]> {
    return ['qwen-max', 'qwen-plus', 'qwen-turbo']
  }
  
  estimateCompressionCost(inputTokens: number, outputTokens: number, modelConfig: any): number {
    const inputCost = inputTokens * modelConfig.cost
    const outputCost = outputTokens * modelConfig.cost * 3
    return inputCost + outputCost
  }
}

export default CompactionModelSelector
