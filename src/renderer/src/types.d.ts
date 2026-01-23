export interface IElectronAPI {
  getSetting: (key: string) => Promise<string | null>
  saveSetting: (key: string, value: string) => Promise<void>
  createSession: (title?: string, modelType?: string) => Promise<string>
  getSessions: () => Promise<any[]>
  getMessages: (sessionId: string) => Promise<any[]>
  saveMessage: (data: {
    sessionId: string;
    role: string;
    content: string;
    thought?: string;
    type?: string;
    attachments?: any[]
    modelId?: string
    agentId?: string
    parts?: any[]
    tokensUsed?: number
    cost?: number
    isSummary?: boolean
  }) => Promise<string>
  updateSessionTitle: (data: { sessionId: string; title: string }) => Promise<void>
  generateTitle: (data: { providerId: string; config: any; message: string }) => Promise<string>
  deleteSession: (sessionId: string) => Promise<void>
  deleteLastMessage: (sessionId: string) => Promise<void>
  saveImage: (data: { base64: string; mimeType: string; sessionId: string }) => Promise<string>
  getImage: (sessionId: string, filename: string) => Promise<string | null>
  // Agent APIs
  getAgents: () => Promise<any[]>
  getAgent: (agentId: string) => Promise<any>
  saveAgent: (data: {
    id?: string
    name: string
    description: string
    systemPrompt: string
    avatarColor: string
    modelId?: string
    temperature?: number
    isPreset?: boolean
  }) => Promise<string>
  deleteAgent: (agentId: string) => Promise<boolean>
  getPresetAgents: () => Promise<any[]>
  createAgentFromPreset: (presetId: string) => Promise<string | null>
  updateSessionAgent: (data: { sessionId: string; agentId?: string }) => Promise<void>
  // API Config APIs
  getApiConfig: (provider: string) => Promise<any>
  saveApiConfig: (data: { provider: string; apiKey: string; baseUrl?: string }) => Promise<string>
  deleteApiConfig: (provider: string) => Promise<void>
  // Model APIs
  getModels: (provider?: string) => Promise<any[]>
  getModel: (modelId: string) => Promise<any>
  updateModelStatus: (data: { modelId: string; isEnabled: boolean }) => Promise<void>
  // Stream APIs
  startStream: (data: {
    sessionId: string
    providerId: string
    modelId: string
    messages: any[]
    systemPrompt?: string
    temperature?: number
    maxTokens?: number
    apiKey: string
    baseUrl?: string
  }) => Promise<{ success: boolean }>
  stopStream: (sessionId: string) => Promise<{ success: boolean }>
  isStreaming: (sessionId: string) => Promise<boolean>
  onStreamChunk: (callback: (data: { sessionId: string; chunk: string }) => void) => void
  onStreamEvent: (callback: (data: { sessionId: string; event: any }) => void) => void
  onStreamError: (callback: (data: { sessionId: string; error: string }) => void) => void
  downloadFile: (data: { url: string; filename?: string }) => Promise<{ success: boolean, path?: string, error?: string }>
  removeStreamListeners: () => void
}

declare global {
  interface Window {
    api: IElectronAPI
  }
}
