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
    type?: string;
    attachments?: any[]
  }) => Promise<string>
  updateSessionTitle: (data: { sessionId: string; title: string }) => Promise<void>
  deleteSession: (sessionId: string) => Promise<void>
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
}

declare global {
  interface Window {
    api: IElectronAPI
  }
}