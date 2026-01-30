import { Provider, ProviderManager, Model } from './base'

class DefaultProviderManager implements ProviderManager {
  private providers: Map<string, Provider> = new Map()
  private modelCache: Map<string, Model[]> = new Map()

  registerProvider(provider: Provider): void {
    this.providers.set(provider.id, provider)
  }

  getProvider(providerId: string, modelId?: string): Provider | null {
    return this.providers.get(providerId) || null
  }

  getAvailableProviders(): Provider[] {
    return Array.from(this.providers.values())
  }

  async detectAvailableModels(providerId: string, apiKey: string): Promise<string[]> {
    const provider = this.providers.get(providerId)
    if (!provider) return []

    try {
      const models = await provider.getModels(apiKey)
      return models.map(m => m.modelId)
    } catch (error) {
      console.error(`Failed to detect models for ${providerId}:`, error)
      return []
    }
  }

  async getModels(providerId: string, apiKey: string): Promise<Model[]> {
    const cacheKey = `${providerId}:${apiKey.substring(0, 10)}`
    
    if (this.modelCache.has(cacheKey)) {
      return this.modelCache.get(cacheKey)!
    }

    const provider = this.providers.get(providerId)
    if (!provider) return []

    try {
      const models = await provider.getModels(apiKey)
      this.modelCache.set(cacheKey, models)
      return models
    } catch (error) {
      console.error(`Failed to get models for ${providerId}:`, error)
      return []
    }
  }

  clearCache(): void {
    this.modelCache.clear()
  }
}

export const providerManager = new DefaultProviderManager()
export default DefaultProviderManager
