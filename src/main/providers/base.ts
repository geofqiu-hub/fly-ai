export interface StreamEvent {
  type: 'start' | 'text-delta' | 'tool-call' | 'tool-result' | 'finish' | 'error'
  data?: any
}

export interface ToolCall {
  id: string
  name: string
  args: any
}

export interface ToolResult {
  toolCallId: string
  output: any
  isError?: boolean
}

export interface ProviderConfig {
  apiKey: string
  baseUrl?: string
  modelId: string
  provider: 'gemini' | 'openai' | 'glm' | 'qwen'
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
  parts?: MessagePart[]
}

export interface MessagePart {
  type: 'text' | 'image' | 'file' | 'tool-call' | 'tool-result'
  content?: string
  mimeType?: string
  toolCall?: ToolCall
  toolResult?: ToolResult
}

export interface MultimodalParams {
  messages: ChatMessage[]
  config: ProviderConfig
  callbacks: {
    onChunk: (content: string) => void
    onComplete: (fullContent: string) => void
    onError: (error: Error) => void
    onToolCall?: (tool: ToolCall) => void
    onToolResult?: (result: ToolResult) => void
  }
}

export interface ChatParams extends MultimodalParams {
  systemPrompt?: string
  temperature?: number
  maxTokens?: number
}

export interface Model {
  id: string
  provider: string
  modelId: string
  name: string
  capabilities: {
    text: boolean
    image: boolean
    tools: boolean
  }
  contextWindow: number
  inputCost: number
  outputCost: number
  isEnabled: boolean
}

export interface Provider {
  id: string
  name: string

  streamChat(params: ChatParams): AsyncGenerator<StreamEvent>
  streamMultimodal?(params: MultimodalParams): AsyncGenerator<StreamEvent>
  getModels(apiKey?: string): Promise<Model[]>
  estimateTokens(text: string): number
  generateTitle?(params: {
    config: ProviderConfig
    message: string
  }): Promise<string>
}

export interface ProviderManager {
  registerProvider(provider: Provider): void
  getProvider(providerId: string, modelId?: string): Provider | null
  getAvailableProviders(): Provider[]
  detectAvailableModels(providerId: string, apiKey: string): Promise<string[]>
}
