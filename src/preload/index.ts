import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('api', {
  getSetting: (key: string) => ipcRenderer.invoke('get-setting', key),
  saveSetting: (key: string, value: string) => ipcRenderer.invoke('save-setting', key, value),
  createSession: (title?: string) => ipcRenderer.invoke('create-session', title),
  getSessions: () => ipcRenderer.invoke('get-sessions'),
  getMessages: (sessionId: string) => ipcRenderer.invoke('get-messages', sessionId),
  saveMessage: (data: any) => ipcRenderer.invoke('save-message', data),
  updateSessionTitle: (data: any) => ipcRenderer.invoke('update-session-title', data),
  deleteSession: (sessionId: string) => ipcRenderer.invoke('delete-session', sessionId),
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
  createAgentFromPreset: (presetId: string) => ipcRenderer.invoke('create-agent-from-preset', presetId),
  updateSessionAgent: (data: { sessionId: string; agentId?: string }) => ipcRenderer.invoke('update-session-agent', data),
})