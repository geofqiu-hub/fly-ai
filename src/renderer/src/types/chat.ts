export interface MessagePart {
  type: 'text' | 'image' | 'file' | 'tool-call' | 'tool-result'
  content?: string
  mimeType?: string
  toolName?: string
  toolInput?: any
  toolOutput?: any
  metadata?: any
}

export interface Message {
  id: string
  sessionId: string
  role: 'user' | 'assistant' | 'system'
  content: string
  thought?: string
  parts?: MessagePart[]
  modelId?: string
  agentId?: string
  type?: 'text' | 'image'
  attachments?: any[]
  tokensUsed?: number
  cost?: number
  isSummary?: boolean
  createdAt: number
}

export interface Agent {
  id: string
  name: string
  description: string
  system_prompt: string
  avatar_color: string
  model_id?: string
  temperature?: number
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

export interface StreamCallbacks {
  onChunk: (content: string) => void
  onComplete: (content: string) => void
  onError: (error: Error) => void
}

export interface StreamEvent {
  type: 'start' | 'text-delta' | 'thought-delta' | 'tool-call' | 'tool-result' | 'finish' | 'error'
  data?: any
}
