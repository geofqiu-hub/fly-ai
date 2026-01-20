export interface Message {
  id: string
  role: 'user' | 'model'
  content: string
  type: 'text' | 'image'
  attachments?: any[]
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

export interface StreamCallbacks {
  onChunk: (content: string) => void
  onComplete: (content: string) => void
  onError: (error: Error) => void
}
