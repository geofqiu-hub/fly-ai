import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('api', {
  getSetting: (key: string) => ipcRenderer.invoke('get-setting', key),
  saveSetting: (key: string, value: string) => ipcRenderer.invoke('save-setting', key, value),
  createSession: (title?: string) => ipcRenderer.invoke('create-session', title),
  getSessions: () => ipcRenderer.invoke('get-sessions'),
  getMessages: (sessionId: string) => ipcRenderer.invoke('get-messages', sessionId),
  saveMessage: (data: {
    sessionId: string
    role: string
    content: string
    thought?: string
    type?: string
    attachments?: any[]
    modelId?: string
    agentId?: string
    parts?: any[]
    tokensUsed?: number
    cost?: number
    isSummary?: boolean
  }) => ipcRenderer.invoke('save-message', data),
  updateSessionTitle: (data: any) => ipcRenderer.invoke('update-session-title', data),
  generateTitle: (data: { providerId: string; config: any; message: string }) => ipcRenderer.invoke('generate-title', data),
  deleteSession: (sessionId: string) => ipcRenderer.invoke('delete-session', sessionId),
  deleteLastMessage: (sessionId: string) => ipcRenderer.invoke('delete-last-message', sessionId),
  saveImage: (data: { base64: string; mimeType: string; sessionId: string }) => ipcRenderer.invoke('save-image', data),
  getImage: (sessionId: string, filename: string) => ipcRenderer.invoke('get-image', sessionId, filename),
  // Agent APIs
  getAgents: () => ipcRenderer.invoke('get-agents'),
  getAgent: (agentId: string) => ipcRenderer.invoke('get-agent', agentId),
  saveAgent: (data: {
    id?: string
    name: string
    description: string
    systemPrompt: string
    avatarColor: string
    modelId?: string
    temperature?: number
    isPreset?: boolean
  }) => ipcRenderer.invoke('save-agent', data),
  deleteAgent: (agentId: string) => ipcRenderer.invoke('delete-agent', agentId),
  getPresetAgents: () => ipcRenderer.invoke('get-preset-agents'),
  createAgentFromPreset: (presetId: string, forceNew?: boolean) => ipcRenderer.invoke('create-agent-from-preset', presetId, forceNew),
  updateSessionAgent: (data: { sessionId: string; agentId?: string }) => ipcRenderer.invoke('update-session-agent', data),
  // API Config APIs
  getApiConfig: (provider: string) => ipcRenderer.invoke('get-api-config', provider),
  saveApiConfig: (data: { provider: string; apiKey: string; baseUrl?: string }) => ipcRenderer.invoke('save-api-config', data),
  deleteApiConfig: (provider: string) => ipcRenderer.invoke('delete-api-config', provider),
  // Model APIs
  getModels: (provider?: string) => ipcRenderer.invoke('get-models', provider),
  getModel: (modelId: string) => ipcRenderer.invoke('get-model', modelId),
  updateModelStatus: (data: { modelId: string; isEnabled: boolean }) => ipcRenderer.invoke('update-model-status', data),
  updateModelId: (data: { id: string; modelId: string }) => ipcRenderer.invoke('update-model-id', data),
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
  }) => {
    console.log('[preload] startStream called', data)
    return ipcRenderer.invoke('start-stream', data)
  },
  stopStream: (sessionId: string) => ipcRenderer.invoke('stop-stream', sessionId),
  isStreaming: (sessionId: string) => ipcRenderer.invoke('is-streaming', sessionId),
  onStreamChunk: (callback: (data: { sessionId: string; chunk: string }) => void) => {
    ipcRenderer.on('stream-chunk', (_event, data) => callback(data))
  },
  onStreamEvent: (callback: (data: { sessionId: string; event: any }) => void) => {
    ipcRenderer.on('stream-event', (_event, data) => callback(data))
  },
  onStreamError: (callback: (data: { sessionId: string; error: string }) => void) => {
    const subscription = (_event: any, data: any) => callback(data)
    ipcRenderer.on('stream-error', subscription)
    return () => ipcRenderer.removeListener('stream-error', subscription)
  },
  downloadFile: (data: { url: string; filename?: string }) => ipcRenderer.invoke('download-file', data),
  removeStreamListeners: () => {
    ipcRenderer.removeAllListeners('stream-chunk')
    ipcRenderer.removeAllListeners('stream-event')
    ipcRenderer.removeAllListeners('stream-error')
  }
})
